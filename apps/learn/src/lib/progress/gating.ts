/** Pure gating rules (master prompt §7/§8). No I/O — unit-tested in tests/gating.test.ts. */
import { LEVELS, SESSIONS, pick3, type LevelSlug, type Session } from "@/lib/content/course";
import { t3, type L } from "@/lib/i18n/lang";

export interface SessionState { watched_pct: number; handout_opened: boolean; quiz_submitted: boolean; journal_saved: boolean; completed_at: string | null }
/** `published`, `exams` and `stages` are filled by load.ts when a database is connected; the pure rules
 *  (and the tests) work without them and fall back to the bundled /content JSON. */
export interface LearnerState {
  sessions: Record<number, SessionState>; certificates: LevelSlug[]; overrides: LevelSlug[]; suspended: boolean;
  /** Session number -> is_published as the DB has it. Present = the DB is the one source (so Path, Home and the session page agree). */
  published?: Record<number, boolean>;
  /** Submitted exam attempts by exam key ("foundation-w1", "foundation-final"): passed = any attempt passed. */
  exams?: Record<string, { passed: boolean }>;
  /** Academy stages this learner may open right now (stage_access grants): "winners" = Stage 2, "one" = Stage 3. */
  stages?: string[];
}
export type Status = "complete" | "in_progress" | "not_started" | "locked";
/** `why` holds the lock reason in all three languages; `reason` (English) and `reasonHi` (Hinglish) mirror it
 *  for callers that have not moved to tr(g.why, lang) yet. */
export interface Gate { status: Status; why: L | null; reason: string | null; reasonHi: string | null; unlockHref: string | null }

export const EMPTY: SessionState = { watched_pct: 0, handout_opened: false, quiz_submitted: false, journal_saved: false, completed_at: null };
export const stateOf = (ls: LearnerState, n: number): SessionState => ls.sessions[n] ?? EMPTY;

/** "Session complete" gate: quiz submitted + journal saved (§7). Attendance points additionally need video >= 80% + handout (§9). */
export const isComplete = (s: SessionState) => s.quiz_submitted && s.journal_saved;

/** One publish flag for every page: the DB's when load.ts read it (a row it could not see counts as unpublished,
 *  same as liveSession), else the JSON's. */
export const isPublished = (ls: LearnerState, s: Session) => (ls.published ? ls.published[s.number] ?? false : s.is_published);
/** What a learner can actually take in a level: published sessions only, so drafts never inflate "x of N". */
export const stageSessions = (ls: LearnerState, level: LevelSlug) => SESSIONS.filter((s) => s.level === level && isPublished(ls, s));

export function levelOpen(ls: LearnerState, level: LevelSlug): boolean {
  const lv = LEVELS.find((l) => l.slug === level)!;
  if (lv.sequence === 1) return true;
  if (ls.overrides.includes(level)) return true;
  const prev = LEVELS.find((l) => l.sequence === lv.sequence - 1)!;
  return ls.certificates.includes(prev.slug);
}

/** The level the learner is on now: the first open level that has published sessions and no issued certificate;
 *  once all of those are certified, the last certified one. Never a locked or unpublished draft tier — the old
 *  `nextSession() ?? last session` fallback moved a Tier 1 graduate to Tier 3 / Session 61. */
export function currentLevel(ls: LearnerState): LevelSlug {
  const live = [...LEVELS].sort((a, b) => a.sequence - b.sequence).filter((l) => stageSessions(ls, l.slug).length > 0);
  const working = live.find((l) => levelOpen(ls, l.slug) && !ls.certificates.includes(l.slug));
  if (working) return working.slug;
  return (live.filter((l) => ls.certificates.includes(l.slug)).pop() ?? live[0] ?? LEVELS[0]).slug;
}
/** Every published session of the level is complete. */
export const levelDone = (ls: LearnerState, level: LevelSlug) => { const ss = stageSessions(ls, level); return ss.length > 0 && ss.every((s) => isComplete(stateOf(ls, s.number))); };

const lock = (why: L, unlockHref: string | null): Gate => ({ status: "locked", why, reason: why.en, reasonHi: why.hi, unlockHref });
const open = (status: Status): Gate => ({ status, why: null, reason: null, reasonHi: null, unlockHref: null });

export function gate(ls: LearnerState, s: Session): Gate {
  if (ls.suspended) return lock(t3("Your account is suspended. Please contact your mentor.", "Aapka account abhi suspend hai. Apne mentor se baat kijiye.", "आपका अकाउंट अभी सस्पेंड है। अपने मेंटर से बात कीजिए।"), null);
  if (!levelOpen(ls, s.level)) {
    const prev = LEVELS.find((l) => l.sequence === LEVELS.find((x) => x.slug === s.level)!.sequence - 1)!;
    const [en, hi, dv] = [pick3(prev, "title", "en"), pick3(prev, "title", "hi"), pick3(prev, "title", "dv")];
    return lock(t3(`Unlocks when your ${en} certificate is issued.`, `${hi} ka certificate milte hi ye khul jayega.`, `${dv} का सर्टिफ़िकेट मिलते ही यह खुल जाएगा।`), "/learn/certificate");
  }
  if (!isPublished(ls, s)) return lock(t3("Not published yet.", "Abhi publish nahi hua hai.", "अभी पब्लिश नहीं हुआ है।"), null);
  const st = stateOf(ls, s.number);
  if (isComplete(st)) return open("complete");
  // The previous PUBLISHED session: unpublishing one later must not strand everyone after it.
  const prevInLevel = SESSIONS.filter((x) => x.level === s.level && x.number < s.number && isPublished(ls, x)).sort((a, b) => b.number - a.number)[0];
  if (prevInLevel && !isComplete(stateOf(ls, prevInLevel.number))) {
    const p = stateOf(ls, prevInLevel.number); const n = prevInLevel.number;
    const both = !p.quiz_submitted && !p.journal_saved;
    const m = both ? t3("quiz + journal", "quiz aur journal", "क्विज़ और जर्नल") : !p.quiz_submitted ? t3("quiz", "quiz", "क्विज़") : t3("journal", "journal", "जर्नल");
    return lock(t3(`Unlocks after you submit the Session ${n} ${m.en}.`, `Session ${n} ka ${m.hi} submit karte hi ye khul jayega.`, `सेशन ${n} का ${m.dv} सबमिट करते ही यह खुल जाएगा।`), `/learn/session/${n}`);
  }
  const started = st.watched_pct > 0 || st.handout_opened || st.quiz_submitted || st.journal_saved;
  return open(started ? "in_progress" : "not_started");
}

/** A lock that only repeats the one before it ("unlocks after Session 14" while 14 is itself locked). Lists show
 *  the reason once, on the first locked card, instead of on every card down the chain. */
export function chainedLock(ls: LearnerState, g: Gate): boolean {
  const m = g.unlockHref?.match(/^\/learn\/session\/(\d+)$/);
  const prev = m ? SESSIONS.find((s) => s.number === Number(m[1])) : undefined;
  return !!prev && gate(ls, prev).status === "locked";
}

/** First not-complete, unlocked session — the "Aaj ka ek kaam" target. Pass a level to stay inside it. */
export function nextSession(ls: LearnerState, level?: LevelSlug): Session | null {
  return SESSIONS.find((s) => { if (level && s.level !== level) return false; const g = gate(ls, s); return g.status === "in_progress" || g.status === "not_started"; }) ?? null;
}
export function weekPct(ls: LearnerState, level: LevelSlug, week: number) {
  const ss = stageSessions(ls, level).filter((s) => s.week === week);
  return ss.length ? Math.round((ss.filter((s) => isComplete(stateOf(ls, s.number))).length / ss.length) * 100) : 0;
}

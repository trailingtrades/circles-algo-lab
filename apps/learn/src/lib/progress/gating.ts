/** Pure gating rules (master prompt §7/§8). No I/O — unit-tested in tests/gating.test.ts. */
import { LEVELS, SESSIONS, type LevelSlug, type Session } from "@/lib/content/course";

export interface SessionState { watched_pct: number; handout_opened: boolean; quiz_submitted: boolean; journal_saved: boolean; completed_at: string | null }
export interface LearnerState { sessions: Record<number, SessionState>; certificates: LevelSlug[]; overrides: LevelSlug[]; suspended: boolean }
export type Status = "complete" | "in_progress" | "not_started" | "locked";
export interface Gate { status: Status; reason: string | null; reasonHi: string | null; unlockHref: string | null }

export const EMPTY: SessionState = { watched_pct: 0, handout_opened: false, quiz_submitted: false, journal_saved: false, completed_at: null };
export const stateOf = (ls: LearnerState, n: number): SessionState => ls.sessions[n] ?? EMPTY;

/** "Session complete" gate: quiz submitted + journal saved (§7). Attendance points additionally need video >= 80% + handout (§9). */
export const isComplete = (s: SessionState) => s.quiz_submitted && s.journal_saved;

export function levelOpen(ls: LearnerState, level: LevelSlug): boolean {
  const lv = LEVELS.find((l) => l.slug === level)!;
  if (lv.sequence === 1) return true;
  if (ls.overrides.includes(level)) return true;
  const prev = LEVELS.find((l) => l.sequence === lv.sequence - 1)!;
  return ls.certificates.includes(prev.slug);
}

export function gate(ls: LearnerState, s: Session): Gate {
  if (ls.suspended) return { status: "locked", reason: "Account suspended. Contact your mentor.", reasonHi: "Account suspended hai. Apne mentor se baat kijiye.", unlockHref: null };
  if (!levelOpen(ls, s.level)) {
    const prev = LEVELS.find((l) => l.sequence === LEVELS.find((x) => x.slug === s.level)!.sequence - 1)!;
    return { status: "locked", reason: `Unlocks when your ${prev.title_en} certificate is issued.`, reasonHi: `${prev.title_en} ka certificate milte hi khulega.`, unlockHref: "/learn/certificate" };
  }
  if (!s.is_published) return { status: "locked", reason: "Not published yet.", reasonHi: "Abhi publish nahi hua.", unlockHref: null };
  const st = stateOf(ls, s.number);
  if (isComplete(st)) return { status: "complete", reason: null, reasonHi: null, unlockHref: null };
  const prevInLevel = SESSIONS.filter((x) => x.level === s.level && x.number < s.number).sort((a, b) => b.number - a.number)[0];
  if (prevInLevel && !isComplete(stateOf(ls, prevInLevel.number))) {
    const p = stateOf(ls, prevInLevel.number);
    const missing = [!p.quiz_submitted && "quiz", !p.journal_saved && "journal"].filter(Boolean).join(" + ");
    return { status: "locked", reason: `Unlocks after Session ${prevInLevel.number} ${missing} ${missing.includes("+") ? "are" : "is"} submitted.`, reasonHi: `Session ${prevInLevel.number} ka ${missing} submit hone ke baad khulega.`, unlockHref: `/learn/session/${prevInLevel.number}` };
  }
  const started = st.watched_pct > 0 || st.handout_opened || st.quiz_submitted || st.journal_saved;
  return { status: started ? "in_progress" : "not_started", reason: null, reasonHi: null, unlockHref: null };
}

/** First not-complete, unlocked session — the "Aaj ka ek kaam" target. */
export function nextSession(ls: LearnerState): Session | null {
  return SESSIONS.find((s) => { const g = gate(ls, s); return g.status === "in_progress" || g.status === "not_started"; }) ?? null;
}
export function weekPct(ls: LearnerState, level: LevelSlug, week: number) {
  const ss = SESSIONS.filter((s) => s.level === level && s.week === week);
  return Math.round((ss.filter((s) => isComplete(stateOf(ls, s.number))).length / ss.length) * 100);
}

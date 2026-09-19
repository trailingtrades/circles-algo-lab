/** Pure gating rules — run: npx tsx tests/gating.test.ts */
import { gate, nextSession, levelOpen, weekPct, currentLevel, stageSessions, type LearnerState } from "../src/lib/progress/gating";
import { SESSIONS, LEVELS, EXAMS, getSession, quizPublic, examPublic, examKey, isWeekReviewDay, pick3, optionText, publicOption } from "../src/lib/content/course";
import { tr, t3, isLang, type Lang } from "../src/lib/i18n/lang";
import quizJson from "../../../content/quizzes/foundation.json";
import examJson from "../../../content/exams/foundation.json";
let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d = "") => { if (c) pass++; else fail++; console.log(`${c ? "  ok  " : "  FAIL"} ${n} ${c ? "" : d}`); };
const done = { watched_pct: 100, handout_opened: true, quiz_submitted: true, journal_saved: true, completed_at: "x" };
const fresh: LearnerState = { sessions: {}, certificates: [], overrides: [], suspended: false };

ok("61 sessions in content (21 + 20 + 20)", SESSIONS.length === 61);
ok("numbers 1..61 unique and contiguous", SESSIONS.every((s, i) => s.number === i + 1));
ok("Tier 1 = 21 published sessions across 3 weeks of 7", SESSIONS.filter((s) => s.level === "foundation").length === 21 && SESSIONS.filter((s) => s.level === "foundation").every((s) => s.is_published && s.day >= 1 && s.day <= 7));
ok("every Tier 1 session has 5 quiz questions", SESSIONS.filter((s) => s.level === "foundation").every((s) => quizPublic(s.number).length === 5));
ok("every Tier 1 session has structured content", SESSIONS.filter((s) => s.level === "foundation").every((s) => s.content.topics.length >= 4 && tr(s.content.kaam, "en").length > 40 && tr(s.content.journal_prompt, "en").length > 10));
ok("week review days are 7/14/21 for Tier 1", [7, 14, 21].every((n) => isWeekReviewDay(getSession(n)!)) && ![1, 6, 8].some((n) => isWeekReviewDay(getSession(n)!)));
ok("every session has a prompt", SESSIONS.every((s) => s.prompts.length > 0));
ok("fresh learner: session 1 not_started", gate(fresh, getSession(1)!).status === "not_started");
ok("fresh learner: session 2 locked with reason naming session 1", (() => { const g = gate(fresh, getSession(2)!); return g.status === "locked" && /Session 1/.test(g.reason!) && g.unlockHref === "/learn/session/1"; })());
ok("fresh learner: session 22 locked by level", /Stage 1 · Basic certificate/.test(gate(fresh, getSession(22)!).reason!));
ok("fresh learner: next session is 1", nextSession(fresh)?.number === 1);
const s1 = { ...fresh, sessions: { 1: done } };
ok("after S1: S2 not_started, S3 locked", gate(s1, getSession(2)!).status === "not_started" && gate(s1, getSession(3)!).status === "locked");
const half = { ...fresh, sessions: { 1: done, 2: { ...done, journal_saved: false } } };
ok("quiz-only S2 is in_progress; S3 reason says journal", gate(half, getSession(2)!).status === "in_progress" && /journal/.test(gate(half, getSession(3)!).reason!));
ok("week pct after S1 = 14 (1 of 7)", weekPct(s1, "foundation", 1) === 14);
const allF: LearnerState = { ...fresh, sessions: Object.fromEntries(Array.from({ length: 21 }, (_, i) => [i + 1, done])) };
ok("all Tier 1 done but no certificate: S22 still locked", gate(allF, getSession(22)!).status === "locked" && !levelOpen(allF, "intermediate"));
ok("with Tier 1 certificate: S22 locked only because it is unpublished (Tier 2 content pending)", gate({ ...allF, certificates: ["foundation"] }, getSession(22)!).reason === "Not published yet.");
ok("admin override opens Intermediate without certificate", levelOpen({ ...fresh, overrides: ["intermediate"] }, "intermediate"));
ok("Advanced needs Intermediate certificate, not Foundation", !levelOpen({ ...fresh, certificates: ["foundation"] }, "advanced") && levelOpen({ ...fresh, certificates: ["intermediate"] }, "advanced"));
ok("suspended: everything locked", gate({ ...allF, suspended: true }, getSession(1)!).status === "locked");
ok("Hinglish reason has no Devanagari", SESSIONS.every((s) => !/[ऀ-ॿ]/.test(gate(fresh, s).reasonHi ?? "")));
// v3 API: reasons in three languages (why), one publish source (published), and the current level.
ok("every lock reason has en + Hinglish + dv, and dv is Devanagari", SESSIONS.every((s) => { const w = gate(fresh, s).why; return !w || (!!w.en && !!w.hi && /[ऀ-ॿ]/.test(w.dv) && !/[ऀ-ॿ]/.test(w.hi)); }));
ok("Tier 1 graduate stays on foundation (never jumps to Tier 3 / S61)", currentLevel(allF) === "foundation" && currentLevel({ ...allF, certificates: ["foundation"] }) === "foundation" && nextSession(allF, "foundation") === null);
ok("fresh learner is on foundation; stage has 21 published sessions", currentLevel(fresh) === "foundation" && stageSessions(fresh, "foundation").length === 21);
const unpub5: LearnerState = { ...fresh, sessions: Object.fromEntries([1, 2, 3, 4].map((n) => [n, done])), published: Object.fromEntries(SESSIONS.map((s) => [s.number, s.is_published && s.number !== 5])) };
ok("DB-unpublished S5: locked, and S6 unlocks from S4 (nobody is stranded)", gate(unpub5, getSession(5)!).status === "locked" && gate(unpub5, getSession(6)!).status === "not_started" && stageSessions(unpub5, "foundation").length === 20);

// ---- the answer never reaches the browser (audit 19 Sep: options[].distractor marked the right option) ----
const DEVA = /[ऀ-ॿ]/;
type BankQ = { stem_hi: string; options: { en: string; hi: string; dv?: string; distractor?: boolean; correct?: boolean }[]; correct_index: number; explanation_hi: string };
const quizBanks = quizJson as unknown as { session: number; questions: BankQ[] }[];
const examBanks = examJson as unknown as { level: string; week: number | null; questions: BankQ[] }[];
const pub = [...SESSIONS.map((s) => quizPublic(s.number)), ...EXAMS.map((e) => examPublic(examKey(e)))].flat();
const LEAK = /"(distractor|correct|correct_index|explanation(_[a-z]+)?)"\s*:/;
ok("public quiz + exam questions carry no answer (no distractor / correct / explanation keys)", pub.length >= 105 && !LEAK.test(JSON.stringify(pub)), `${pub.length} questions`);
ok("public options are words only: {en, hi, dv?}", pub.every((q) => q.options.every((o) => Object.keys(o).every((k) => k === "en" || k === "hi" || k === "dv"))));
ok("publicOption drops a legacy distractor flag and a v3 correct flag", JSON.stringify(publicOption({ en: "a", hi: "a", distractor: false } as never)) === '{"en":"a","hi":"a"}' && !("correct" in publicOption({ en: "a", hi: "a", dv: "ए", correct: true } as never)));

// ---- the answer is not always option A (it was A in 180 of 180 questions) ----
const spread = (banks: { questions: BankQ[] }[]) => { const c = [0, 0, 0, 0]; for (const b of banks) for (const q of b.questions) c[q.correct_index] = (c[q.correct_index] ?? 0) + 1; return c; };
const share = (c: number[]) => Math.max(...c) / c.reduce((a, b) => a + b, 0);
const qs = spread(quizBanks), es = spread(examBanks);
ok("quiz answers are spread over A-D: every position used, none above 40%", qs.every((x) => x > 0) && share(qs) <= 0.4, qs.join("/"));
ok("exam answers are spread over A-D: every position used, none above 40%", es.every((x) => x > 0) && share(es) <= 0.4, es.join("/"));
const flagOk = (q: BankQ) => { const right = q.options.flatMap((o, i) => (o.correct === true || o.distractor === false ? [i] : [])); return !q.options.some((o) => "distractor" in o || "correct" in o) || (right.length === 1 && right[0] === q.correct_index); };
ok("every answer key agrees with its option flags (a shuffle moved correct_index too)", [...quizBanks, ...examBanks].every((b) => b.questions.every(flagOk)));

// ---- three languages: en / hi (Hinglish, Roman) / dv (हिंदी, Devanagari) ----
const L3: Lang[] = ["en", "hi", "dv"];
ok("Lang is en | hi | dv and nothing else", L3.every(isLang) && !isLang("hg") && !isLang("HI"));
ok("tr falls back dv -> hi -> en", tr(t3("Stop-loss", "Stop-loss lagaiye", "स्टॉप-लॉस लगाइए"), "dv") === "स्टॉप-लॉस लगाइए" && tr({ en: "Stop-loss", hi: "Stop-loss lagaiye" }, "dv") === "Stop-loss lagaiye" && tr({ en: "Stop-loss", hi: "" }, "dv") === "Stop-loss" && tr("same", "dv") === "same");
ok("level titles resolve in all three languages (हिंदी in Devanagari)", LEVELS.every((l) => pick3(l, "title", "en") === l.title_en && pick3(l, "title", "hi") === l.title_hi && DEVA.test(pick3(l, "title", "dv"))));
ok("a session without title_dv shows Hinglish to a हिंदी reader", (() => { const s = getSession(1)!; return pick3({ ...s, title_dv: null }, "title", "dv") === s.title_hi; })());
ok("optionText picks the learner's language with fallback", optionText({ en: "Rule", hi: "Niyam" }, "dv") === "Niyam" && optionText({ en: "Rule", hi: "Niyam", dv: "नियम" }, "dv") === "नियम" && optionText({ en: "Rule", hi: "Niyam" }, "en") === "Rule");
ok("Hinglish quiz text is Roman script only (stems, options, explanations)", [...quizBanks, ...examBanks].every((b) => b.questions.every((q) => !DEVA.test(q.stem_hi) && !DEVA.test(q.explanation_hi) && q.options.every((o) => !DEVA.test(o.hi)))));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

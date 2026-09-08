/** Pure gating rules — run: npx tsx tests/gating.test.ts */
import { gate, nextSession, levelOpen, weekPct, type LearnerState } from "../src/lib/progress/gating";
import { SESSIONS, getSession } from "../src/lib/content/course";
let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d = "") => { if (c) pass++; else fail++; console.log(`${c ? "  ok  " : "  FAIL"} ${n} ${c ? "" : d}`); };
const done = { watched_pct: 100, handout_opened: true, quiz_submitted: true, journal_saved: true, completed_at: "x" };
const fresh: LearnerState = { sessions: {}, certificates: [], overrides: [], suspended: false };

ok("60 sessions in content", SESSIONS.length === 60);
ok("numbers 1..60 unique and contiguous", SESSIONS.every((s, i) => s.number === i + 1));
ok("every session has a prompt", SESSIONS.every((s) => s.prompts.length > 0));
ok("fresh learner: session 1 not_started", gate(fresh, getSession(1)!).status === "not_started");
ok("fresh learner: session 2 locked with reason naming session 1", (() => { const g = gate(fresh, getSession(2)!); return g.status === "locked" && /Session 1/.test(g.reason!) && g.unlockHref === "/learn/session/1"; })());
ok("fresh learner: session 21 locked by level", /Foundation certificate/.test(gate(fresh, getSession(21)!).reason!));
ok("fresh learner: next session is 1", nextSession(fresh)?.number === 1);
const s1 = { ...fresh, sessions: { 1: done } };
ok("after S1: S2 not_started, S3 locked", gate(s1, getSession(2)!).status === "not_started" && gate(s1, getSession(3)!).status === "locked");
const half = { ...fresh, sessions: { 1: done, 2: { ...done, journal_saved: false } } };
ok("quiz-only S2 is in_progress; S3 reason says journal", gate(half, getSession(2)!).status === "in_progress" && /journal/.test(gate(half, getSession(3)!).reason!));
ok("week pct after S1 = 20", weekPct(s1, "foundation", 1) === 20);
const allF: LearnerState = { ...fresh, sessions: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i + 1, done])) };
ok("all Foundation done but no certificate: S21 still locked", gate(allF, getSession(21)!).status === "locked" && !levelOpen(allF, "intermediate"));
ok("with Foundation certificate: S21 not_started", gate({ ...allF, certificates: ["foundation"] }, getSession(21)!).status === "not_started");
ok("admin override opens Intermediate without certificate", levelOpen({ ...fresh, overrides: ["intermediate"] }, "intermediate"));
ok("Advanced needs Intermediate certificate, not Foundation", !levelOpen({ ...fresh, certificates: ["foundation"] }, "advanced") && levelOpen({ ...fresh, certificates: ["intermediate"] }, "advanced"));
ok("suspended: everything locked", gate({ ...allF, suspended: true }, getSession(1)!).status === "locked");
ok("Hinglish reason has no Devanagari", SESSIONS.every((s) => !/[ऀ-ॿ]/.test(gate(fresh, s).reasonHi ?? "")));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

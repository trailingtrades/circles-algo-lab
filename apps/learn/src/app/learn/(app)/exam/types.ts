/** Exam shapes shared by the server helpers and the client runner. No imports on purpose: the client must never pull in lib/content (it bundles the answer keys). */
export type Band = "distinction" | "pass" | "fail";
export type Answers = Record<number, number>;
export type ExamAttempt = { id: string; attempt_no: number; started_at: string; deadline_at: string | null; answers: Answers; submitted_at: string | null; score: number | null; max_score: number | null };
/** `correct` and `explanation` are present only when `reveal` is true (after a pass, or once no attempt is left).
 *  The explanation carries all three languages (same shape as lib/i18n's L) so a language switch after submitting still matches the stems. */
export type QResult = { idx: number; chosen: number; right: boolean; correct?: number; explanation?: { en: string; hi: string; dv: string } };
export type ExamResult = { error?: string; score?: number; max?: number; band?: Band; late?: boolean; attemptNo?: number; attemptsLeft?: number; reveal?: boolean; results?: QResult[] };
/** An attempt as handed to the browser, with the server clock at that moment so the countdown can correct for a wrong device clock. */
export type LiveAttempt = ExamAttempt & { now: number };
/** A question as the browser gets it: the words only, already in the learner's language. Sent only once an attempt is running. */
export type ExamQuestion = { idx: number; stem: string; options: string[] };
export type StartResult = { error?: string; attempt?: LiveAttempt; attemptsLeft?: number; questions?: ExamQuestion[] };
/** The exam's rules as the intro shows them (from the exams row when the DB is connected). */
export type ExamFacts = { count: number; minutes: number; allowed: number; total: number; pass: number; distinction: number };
/** Everything the intro needs. `open` = an attempt already running (resumed without a click); nothing starts until the learner presses Start. */
export type IntroView = { state: "demo" | "error" | "ready"; msg?: string; used: number; passed: boolean; best: { score: number; max: number; band: Band } | null; open: LiveAttempt | null; closed: ExamResult | null };

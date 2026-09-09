/** Scoring constants and pure helpers (master prompt §9). Points are awarded server-side via award(); this file only computes amounts. */
export const WEIGHTS = { attendance: 200, quiz: 200, exam: 250, practice: 250, discipline: 100 } as const;
export const PER_SESSION = { attendance: 10, quiz: 10 } as const;           // 10 x 20 sessions per level
export const EXAM_POINTS = { weekly: 50, final: 100 } as const;             // 3 x 50 + 100 = 250
export const RETAKE_CAP = 0.8;                                             // a retake is capped at 80% of full marks
export const GRADE_FRACTION: Record<"A" | "B" | "C" | "D" | "F", number> = { A: 1, B: 0.85, C: 0.7, D: 0.5, F: 0 };
export const DISCIPLINE = { friday_on_time: 10, galti_log: 3, journal_streak_week: 5, exam_on_time: 5 } as const;

/** Quiz: 10 pts pro-rated by correctness, 2 decimals. */
export const quizPoints = (score: number, max: number) => max > 0 ? Math.round((score / max) * PER_SESSION.quiz * 100) / 100 : 0;
/** Exam: pro-rated to the exam's point value; retakes (attempt_no > 1) capped at 80%. Best attempt counts — the awarder uses a per-exam ref so only the higher value is added as a delta event. */
export function examPoints(score: number, max: number, attemptNo: number, isFinal: boolean) {
  const full = isFinal ? EXAM_POINTS.final : EXAM_POINTS.weekly;
  const raw = max > 0 ? (score / max) * full : 0;
  return Math.round(Math.min(raw, attemptNo > 1 ? full * RETAKE_CAP : full) * 100) / 100;
}
export const practicePoints = (grade: keyof typeof GRADE_FRACTION, artefactPoints: number) => Math.round(GRADE_FRACTION[grade] * artefactPoints * 100) / 100;

/** Pure recompute mirror of app.recompute_scores(): used for display + tests, never as a source of truth. */
export interface ScoreEvent { kind: "attendance" | "quiz" | "exam" | "practice" | "discipline" | "override"; points: number }
export function computeScore(events: ScoreEvent[]) {
  const sum = (k: ScoreEvent["kind"]) => events.filter((e) => e.kind === k).reduce((a, e) => a + Number(e.points), 0);
  const c = { attendance: Math.min(sum("attendance"), WEIGHTS.attendance), quiz: Math.min(sum("quiz"), WEIGHTS.quiz), exam: Math.min(sum("exam"), WEIGHTS.exam), practice: Math.min(sum("practice"), WEIGHTS.practice), discipline: Math.min(sum("discipline"), WEIGHTS.discipline) };
  const total = Math.max(0, Math.min(1000, c.attendance + c.quiz + c.exam + c.practice + c.discipline + sum("override")));
  return { ...c, override: sum("override"), total: Math.round(total * 100) / 100 };
}

/** The teaching tool: the next 3 actions that move the score most (§9). */
export interface NextAction { label: string; labelHi: string; points: number; href: string }
export function nextActions(input: { components: ReturnType<typeof computeScore>; openSession: number | null; sessionsMissingAttendance: number[]; pendingExam: { key: string; title: string; isFinal: boolean } | null; fridayDue: boolean; portfolioRowsComplete: number; level: string }): NextAction[] {
  const out: NextAction[] = [];
  if (input.pendingExam) out.push({ label: `Sit the ${input.pendingExam.title}`, labelHi: `${input.pendingExam.title} dijiye`, points: input.pendingExam.isFinal ? EXAM_POINTS.final : EXAM_POINTS.weekly, href: `/learn/exam/${input.pendingExam.key}` });
  if (input.openSession) out.push({ label: `Finish Session ${input.openSession}: quiz + journal`, labelHi: `Session ${input.openSession} ka quiz + journal poora kijiye`, points: PER_SESSION.quiz + PER_SESSION.attendance, href: `/learn/session/${input.openSession}` });
  if (input.sessionsMissingAttendance.length) out.push({ label: `Watch 80%+ and open the handout for Session ${input.sessionsMissingAttendance[0]}`, labelHi: `Session ${input.sessionsMissingAttendance[0]} ka video 80% dekhiye aur handout kholiye`, points: PER_SESSION.attendance * input.sessionsMissingAttendance.length, href: `/learn/session/${input.sessionsMissingAttendance[0]}` });
  if (input.level === "foundation" && input.portfolioRowsComplete < 5) out.push({ label: `Complete a mock-portfolio row with Full Why x2 (${input.portfolioRowsComplete}/5)`, labelHi: `Mock-portfolio row poori kijiye, Full Why x2 ke saath (${input.portfolioRowsComplete}/5)`, points: 50, href: "/learn/portfolio" });
  if (input.fridayDue) out.push({ label: "Submit this week's Friday review", labelHi: "Is hafte ka Friday review submit kijiye", points: DISCIPLINE.friday_on_time, href: "/learn/portfolio" });
  return out.sort((a, b) => b.points - a.points).slice(0, 3);
}

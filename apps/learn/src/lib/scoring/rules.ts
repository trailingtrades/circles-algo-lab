/** Scoring constants and pure helpers (master prompt §9). Points are awarded server-side via award(); this file only computes amounts.
 *  Pure and client-safe: no content JSON, no Supabase. The i18n import is relative so the tsx test runner resolves it without path aliases. */
import { t3, tr, type L, type Lang } from "../i18n/lang";

export const WEIGHTS = { attendance: 200, quiz: 200, exam: 250, practice: 250, discipline: 100 } as const;
export const PER_SESSION = { attendance: 10, quiz: 10 } as const;           // 10 per session; Tier 1 has 21 sessions, the 200 cap absorbs the extra
export const EXAM_POINTS = { weekly: 50, final: 100 } as const;             // 3 x 50 + 100 = 250
export const RETAKE_CAP = 0.8;                                             // a retake is capped at 80% of full marks
export const GRADE_FRACTION: Record<"A" | "B" | "C" | "D" | "F", number> = { A: 1, B: 0.85, C: 0.7, D: 0.5, F: 0 };
export const DISCIPLINE = { friday_on_time: 10, galti_log: 3, journal_streak_week: 5, exam_on_time: 5 } as const;

/** Quiz: 10 pts pro-rated by correctness, 2 decimals. */
export const quizPoints = (score: number, max: number) => max > 0 ? Math.round((score / max) * PER_SESSION.quiz * 100) / 100 : 0;
/** Exam: pro-rated to the exam's point value; retakes (attempt_no > 1) capped at 80%. Best attempt counts — the awarder only adds the delta over what the exam already earned. */
export function examPoints(score: number, max: number, attemptNo: number, isFinal: boolean) {
  const full = isFinal ? EXAM_POINTS.final : EXAM_POINTS.weekly;
  const raw = max > 0 ? (score / max) * full : 0;
  return Math.round(Math.min(raw, attemptNo > 1 ? full * RETAKE_CAP : full) * 100) / 100;
}
export const practicePoints = (grade: keyof typeof GRADE_FRACTION, artefactPoints: number) => Math.round(GRADE_FRACTION[grade] * artefactPoints * 100) / 100;

/** Exam band from the exam's OWN marks (exams row), scaled when the question bank's max differs from total_marks.
 *  Replaces the old hard-coded 30/36, which turned a Tier-1 25/30 into a Distinction (the Tier-1 bar is 26/30). */
export type Band = "distinction" | "pass" | "fail";
export function examBand(score: number, max: number, m: { total_marks: number; pass_marks: number; distinction_marks: number }): Band {
  const scale = m.total_marks > 0 && max > 0 ? max / m.total_marks : 1, eps = 1e-9;
  return score + eps >= m.distinction_marks * scale ? "distinction" : score + eps >= m.pass_marks * scale ? "pass" : "fail";
}

/** Pure recompute mirror of app.recompute_scores(): used for display + tests, never as a source of truth. */
export interface ScoreEvent { kind: "attendance" | "quiz" | "exam" | "practice" | "discipline" | "override"; points: number }
export function computeScore(events: ScoreEvent[]) {
  const sum = (k: ScoreEvent["kind"]) => events.filter((e) => e.kind === k).reduce((a, e) => a + Number(e.points), 0);
  const c = { attendance: Math.min(sum("attendance"), WEIGHTS.attendance), quiz: Math.min(sum("quiz"), WEIGHTS.quiz), exam: Math.min(sum("exam"), WEIGHTS.exam), practice: Math.min(sum("practice"), WEIGHTS.practice), discipline: Math.min(sum("discipline"), WEIGHTS.discipline) };
  const total = Math.max(0, Math.min(1000, c.attendance + c.quiz + c.exam + c.practice + c.discipline + sum("override")));
  return { ...c, override: sum("override"), total: Math.round(total * 100) / 100 };
}

/** Leaderboard bands come from SQL in English ('Top 10' … 'Keep going'); this is their on-screen wording. Position only, never money. */
const BANDS: Record<string, L> = {
  "Top 10": t3("Top 10", "Top 10", "टॉप 10"),
  "Top 25%": t3("Top 25%", "Top 25%", "टॉप 25%"),
  "Top 50%": t3("Top 50%", "Top 50%", "टॉप 50%"),
  "Keep going": t3("Keep going", "Lage rahiye", "लगे रहिए"),
};
export const bandLabel = (band: string, lang: Lang) => (BANDS[band] ? tr(BANDS[band], lang) : band);

/** The teaching tool: the next 3 actions that move the score most (§9). label = English, labelHi = Hinglish (Roman only), labelDv = हिंदी. */
export interface NextAction { label: string; labelHi: string; labelDv: string; points: number; href: string }
type Title = string | { en: string; hi?: string | null; dv?: string | null };
const act = (l: L, points: number, href: string): NextAction => ({ label: l.en, labelHi: l.hi, labelDv: l.dv, points, href });
export function nextActions(input: { components: ReturnType<typeof computeScore>; openSession: number | null; sessionsMissingAttendance: number[]; pendingExam: { key: string; title: Title; isFinal: boolean } | null; fridayDue: boolean; fridayHref?: string; fridayWeek?: number | null; portfolioRowsComplete: number; level: string }): NextAction[] {
  const out: NextAction[] = [];
  if (input.pendingExam) {
    const x = input.pendingExam.title, en = typeof x === "string" ? x : x.en, hi = typeof x === "string" ? x : x.hi || x.en, dv = typeof x === "string" ? x : x.dv || hi;
    out.push(act(t3(`Sit the ${en}`, `${hi} attempt kijiye`, `${dv} दीजिए`), input.pendingExam.isFinal ? EXAM_POINTS.final : EXAM_POINTS.weekly, `/learn/exam/${input.pendingExam.key}`));
  }
  if (input.openSession) { const n = input.openSession; out.push(act(t3(`Finish Session ${n}: quiz and journal`, `Session ${n} ka quiz aur journal poora kijiye`, `सेशन ${n} का क्विज़ और जर्नल पूरा कीजिए`), PER_SESSION.quiz + PER_SESSION.attendance, `/learn/session/${n}`)); }
  if (input.sessionsMissingAttendance.length) { const n = input.sessionsMissingAttendance[0]; out.push(act(t3(`Session ${n}: open the week's handout (and watch the class video to 80%, if it has one)`, `Session ${n}: hafte ka handout kholiye (aur class video ho to 80% tak dekhiye)`, `सेशन ${n}: हफ़्ते का हैंडआउट खोलिए (और क्लास वीडियो हो तो 80% तक देखिए)`), PER_SESSION.attendance * input.sessionsMissingAttendance.length, `/learn/session/${n}`)); }
  if (input.level === "foundation" && input.portfolioRowsComplete < 5) { const k = input.portfolioRowsComplete; out.push(act(t3(`Complete a mock-portfolio row with Full Why x2 (${k}/5)`, `Mock-portfolio ki ek row Full Why x2 ke saath poori kijiye (${k}/5)`, `मॉक-पोर्टफ़ोलियो की एक रो फ़ुल व्हाई x2 के साथ पूरी कीजिए (${k}/5)`), 50, "/learn/portfolio")); }
  if (input.fridayDue) { const w = input.fridayWeek; out.push(act(w ? t3(`Write the Week ${w} review`, `Week ${w} ka review likhiye`, `हफ़्ता ${w} का रिव्यू लिखिए`) : t3("Write this week's review", "Is hafte ka review likhiye", "इस हफ़्ते का रिव्यू लिखिए"), DISCIPLINE.friday_on_time, input.fridayHref ?? "/learn/path")); }
  return out.sort((a, b) => b.points - a.points).slice(0, 3);
}

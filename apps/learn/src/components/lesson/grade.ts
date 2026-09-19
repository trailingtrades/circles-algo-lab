import type { AnswerKey } from "@/lib/content/course";
import type { L } from "@/lib/i18n/lang";

/** One graded question as the learner sees it after submitting. The key reaches a browser only
 *  inside this shape, i.e. after the one attempt is on record (submitQuiz, or the page's review). */
export type QuizLine = { idx: number; chosen: number; correct: number; right: boolean; explanation: L };
export type Graded = { score: number; max: number; results: QuizLine[] };

/** Grade answers (question position -> chosen option) against the key; an unanswered question counts as wrong.
 *  All three explanation languages go back so a language switch after submitting still reads right. */
export function grade(key: AnswerKey[], answers: Record<number, number>): Graded {
  let score = 0;
  const results = key.map((q, idx) => {
    const chosen = Number.isInteger(answers[idx]) ? answers[idx] : -1;
    const right = chosen === q.correct_index;
    if (right) score += q.marks;
    return { idx, chosen, correct: q.correct_index, right, explanation: { en: q.explanation_en, hi: q.explanation_hi, dv: q.explanation_dv } };
  });
  return { score, max: key.reduce((a, q) => a + q.marks, 0), results };
}

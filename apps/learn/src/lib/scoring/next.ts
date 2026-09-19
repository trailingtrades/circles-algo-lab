/** Which level a learner is "on" and what is due next. Pure (no I/O) so Score, Leaderboard, Home and Certificate can agree. */
import { WEEKS, EXAMS, examKey, pick3, type ExamMeta, type LevelSlug } from "@/lib/content/course";
import { gate, isComplete, stateOf, stageSessions, type LearnerState } from "@/lib/progress/gating";
import type { Lang } from "@/lib/i18n/lang";

/** One definition for every page (it lives in gating.ts next to the publish rules it depends on). */
export { currentLevel } from "@/lib/progress/gating";

/** Exam title in the learner's language. exams.json carries `title` (English) + title_hi / title_dv. */
export const examTitle = (e: ExamMeta, lang: Lang) => pick3({ ...e, title_en: e.title }, "title", lang);
export const examTitles = (e: ExamMeta) => ({ en: examTitle(e, "en"), hi: examTitle(e, "hi"), dv: examTitle(e, "dv") });

/** Published sessions of a level (or one week of it), by the same publish flag Path and Home use. */
const published = (ls: LearnerState, level: LevelSlug, week?: number | null) => stageSessions(ls, level).filter((s) => (week ? s.week === week : true));
const allDone = (ls: LearnerState, ss: ReturnType<typeof stageSessions>) => ss.length > 0 && ss.every((s) => isComplete(stateOf(ls, s.number)));

/** The first exam of the level that is due and not yet submitted. A weekly exam is due once that week's sessions are complete;
 *  the final once every session of the level is. `done` holds exam keys ("foundation-w1") with a submitted attempt. */
export function dueExam(ls: LearnerState, level: LevelSlug, done: Set<string>): ExamMeta | null {
  return EXAMS.filter((e) => e.level === level).find((e) => !done.has(examKey(e)) && allDone(ls, published(ls, level, e.week))) ?? null;
}

/** The earliest week whose review day the learner has reached (unlocked) but has no weekly review for. `reviewed` = session numbers with a friday_review journal. */
export function dueReview(ls: LearnerState, level: LevelSlug, reviewed: Set<number>): { week: number; session: number } | null {
  for (const w of WEEKS.filter((x) => x.level === level).sort((a, b) => a.number - b.number)) {
    const day = published(ls, level, w.number).sort((a, b) => b.day - a.day)[0];
    if (day && gate(ls, day).status !== "locked" && !reviewed.has(day.number)) return { week: w.number, session: day.number };
  }
  return null;
}

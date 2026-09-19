export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { getExam, examPublic, levelOf, pick3 } from "@/lib/content/course";
import { loadLearnerState } from "@/lib/progress/load";
import { isComplete, stateOf, stageSessions } from "@/lib/progress/gating";
import { examTitle } from "@/lib/scoring/next";
import { t3, tr } from "@/lib/i18n/lang";
import { loadExamIntro, questionsFor } from "../server";
import type { ExamFacts, IntroView } from "../types";
import { ExamRunner } from "./ExamRunner";

const S = {
  week: t3("Week", "Week", "हफ़्ता"),
  final: t3("Final exam", "Final exam", "फ़ाइनल एग्ज़ाम"),
  readyWeek: (w: number, d: number, n: number) => t3(`Best taken after you finish the Week ${w} sessions (${d} of ${n} done).`, `Week ${w} ke sessions poore karke dena behtar hai (${n} mein se ${d} ho gaye).`, `हफ़्ता ${w} के सेशन पूरे करके देना बेहतर है (${n} में से ${d} हो गए)।`),
  readyFinal: (d: number, n: number) => t3(`Best taken after you finish all the sessions (${d} of ${n} done).`, `Saare sessions poore karke dena behtar hai (${n} mein se ${d} ho gaye).`, `सारे सेशन पूरे करके देना बेहतर है (${n} में से ${d} हो गए)।`),
};

/** Exam intro -> timed runner -> result. Opening this page never starts an attempt (it used to, silently, on page load). */
export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meta = getExam(id); if (!meta) notFound();
  const [intro, { state, lang }] = await Promise.all([loadExamIntro(id), loadLearnerState()]);
  const bank = examPublic(id);
  const row = intro.state === "ready" ? intro.row : null;
  const facts: ExamFacts = { count: bank.length, minutes: row?.time_limit_min ?? meta.time_limit_min, allowed: row?.attempts_allowed ?? meta.attempts_allowed, total: row?.total_marks ?? meta.total_marks, pass: row?.pass_marks ?? meta.pass_marks, distinction: row?.distinction_marks ?? meta.distinction_marks };
  const c = intro.state === "ready" ? intro.closed : null; // only the score of a timed-out attempt goes to the intro, never its per-question results
  const view: IntroView = intro.state === "ready" ? { state: "ready", used: intro.used, passed: intro.passed, best: intro.best, open: intro.open, closed: c && c.score != null ? { score: c.score, max: c.max, band: c.band, late: c.late } : null } : { state: intro.state, msg: intro.msg, used: 0, passed: false, best: null, open: null, closed: null };
  // The paper goes to the browser only with a running attempt, or once no attempt can follow (passed, or none left: the answers were
  // already revealed), so the reviewed list re-renders in a new language after submit. Words only; the runner must never import lib/content.
  const questions = view.open || (view.state === "ready" && (view.passed || view.used >= facts.allowed)) ? questionsFor(id, lang) : null;
  // A soft nudge, not a lock: the certificate needs 90% of sessions, so the exam stays available.
  const scope = stageSessions(state, meta.level).filter((s) => (meta.week ? s.week === meta.week : true));
  const done = scope.filter((s) => isComplete(stateOf(state, s.number))).length;
  const readiness = scope.length && done < scope.length ? tr(meta.week ? S.readyWeek(meta.week, done, scope.length) : S.readyFinal(done, scope.length), lang) : null;
  return (
    <>
      <p className="col-eyebrow">{pick3(levelOf(meta.level), "title", lang)} · {meta.week ? `${tr(S.week, lang)} ${meta.week}` : tr(S.final, lang)}</p>
      <h1 className="lrn-title">{examTitle(meta, lang)}</h1>
      <ExamRunner key={id} examKey={id} lang={lang} questions={questions} facts={facts} intro={view} readiness={readiness} />
    </>
  );
}

export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { getExam, examPublic } from "@/lib/content/course";
import { supabaseConfigured } from "@/lib/supabase/env";
import { getViewer } from "@/lib/supabase/server";
import { ExamRunner } from "./ExamRunner";
import { Clock } from "@/components/ui/Icon";

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meta = getExam(id); if (!meta) notFound();
  const v = supabaseConfigured() ? await getViewer() : null;
  const questions = examPublic(id);
  return (
    <>
      <p className="col-eyebrow">{meta.level} · {meta.week ? `Week ${meta.week}` : "Final"} · {meta.time_limit_min} min · {meta.attempts_allowed} attempts</p>
      <h1 className="lrn-title">{meta.title}</h1>
      <p className="lrn-muted" style={{ marginTop: 0 }}>Pass {meta.pass_marks}/{meta.total_marks} · Distinction {meta.distinction_marks}/{meta.total_marks} · Best attempt counts; a retake is capped at 80% of the marks.</p>
      {!questions.length ? (
        <div className="col-card col-empty"><Clock size={36} strokeWidth={1.5} aria-hidden /><p className="col-empty__title">Question bank pending</p><p style={{ margin: 0 }}>Is exam ka paper abhi upload nahi hua. Runner tayyar hai; bank aate hi exam khul jayega.</p></div>
      ) : <ExamRunner examKey={id} questions={questions} lang={v?.lang ?? "en"} demo={!v} timeLimitMin={meta.time_limit_min} />}
    </>
  );
}

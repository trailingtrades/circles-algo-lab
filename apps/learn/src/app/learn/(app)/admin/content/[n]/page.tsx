export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/supabase/env";
import { SessionEditor, QuestionEditor } from "./Editors";

export default async function EditSession({ params }: { params: Promise<{ n: string }> }) {
  const { n: raw } = await params; const n = Number(raw);
  if (!supabaseConfigured() || !Number.isInteger(n) || n < 1) notFound();
  await requireViewer(["admin"]);
  const admin = createAdminClient(); // admin-only page; the service role reads correct_index for the editor
  const { data: s } = await admin.from("sessions").select("*").eq("number", n).maybeSingle(); if (!s) notFound();
  // Same order the learner sees and the grader uses (position, then id).
  const { data: qs } = await admin.from("quiz_questions").select("*").eq("session_id", s.id).order("sequence").order("id");
  const nextSequence = (qs ?? []).reduce((m, q) => Math.max(m, Number(q.sequence) + 1), 0);
  return (
    <>
      <Link href="/learn/admin/content" className="lrn-link" style={{ fontSize: "var(--col-text-body-sm)" }}>Back to sessions</Link>
      <p className="col-eyebrow mt-2">Admin · Session {n}</p>
      <h1 className="lrn-title">{s.title_en}</h1>
      <div className="lrn-grid mt-4">
        <section className="col-card" style={{ gridColumn: "1 / -1" }}><h2 className="lrn-session__title">Session</h2><SessionEditor s={s} /></section>
        <section className="col-card" style={{ gridColumn: "1 / -1" }}><h2 className="lrn-session__title">Quiz ({qs?.length ?? 0} questions)</h2>
          {(qs ?? []).map((q) => <QuestionEditor key={q.id} sessionNumber={n} q={q} />)}
          <h3 className="col-eyebrow mt-4">Add a question</h3><QuestionEditor sessionNumber={n} nextSequence={nextSequence} /></section>
      </div>
    </>
  );
}

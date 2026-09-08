export const dynamic = "force-dynamic";
import Link from "next/link";
import { requireViewer } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { SESSIONS } from "@/lib/content/course";

export default async function ContentAdmin() {
  if (!supabaseConfigured()) return <p className="lrn-muted">Supabase not connected — the editor writes to the DB.</p>;
  await requireViewer(["admin"]);
  const sb = await createClient();
  const { data: rows } = await sb.from("sessions").select("id,number,title_en,is_published,is_draft,video_url").order("number");
  const { data: counts } = await sb.from("quiz_questions").select("session_id");
  const qc = new Map<string, number>(); for (const c of counts ?? []) if (c.session_id) qc.set(c.session_id, (qc.get(c.session_id) ?? 0) + 1);
  return (
    <>
      <p className="col-eyebrow">Admin · Content editor</p>
      <h1 className="lrn-title">Sessions</h1>
      <p className="lrn-muted" style={{ marginTop: 0 }}>Edit titles, video links, prompts and quiz banks. Changes are live immediately, compliance-scanned on save, and audited.</p>
      <div className="lrn-table-wrap mt-4"><table className="col-table"><thead><tr><th>#</th><th className="col-text">Title</th><th>Video</th><th>Quiz Q</th><th>State</th><th>Edit</th></tr></thead><tbody>
        {(rows ?? []).map((r) => <tr key={r.id}><td className="col-num">{r.number}</td><td className="col-text">{r.title_en}</td><td style={{ textAlign: "center" }}>{r.video_url ? "yes" : "—"}</td><td className="col-num">{qc.get(r.id) ?? 0}</td><td className="col-text">{r.is_draft ? "draft" : ""}{!r.is_published ? " unpublished" : ""}</td><td style={{ textAlign: "center" }}><Link href={`/learn/admin/content/${r.number}`} className="col-btn col-btn--ghost col-btn--sm">Edit</Link></td></tr>)}
        {!rows?.length && <tr><td colSpan={6} className="col-text lrn-muted">Sessions not seeded yet ({SESSIONS.length} in content JSON). Run npm run db:seed.</td></tr>}
      </tbody></table></div>
    </>
  );
}

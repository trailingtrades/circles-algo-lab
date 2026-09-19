export const dynamic = "force-dynamic";
import Link from "next/link";
import { requireViewer } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { SESSIONS } from "@/lib/content/course";

export default async function ContentAdmin() {
  if (!supabaseConfigured()) return <p className="lrn-muted">The database is not connected; the editor writes to the database.</p>;
  await requireViewer(["admin"]);
  const sb = await createClient();
  // title_dv (the हिंदी title) arrives with migration 0010: ask for it, and retry without it before the migration.
  type Row = { id: string; number: number; title_en: string; is_published: boolean; is_draft: boolean; video_url: string | null; title_dv?: string | null };
  const cols = "id,number,title_en,is_published,is_draft,video_url";
  const first = await sb.from("sessions").select(`${cols},title_dv`).order("number");
  const rows = (first.error ? (await sb.from("sessions").select(cols).order("number")).data : first.data) as Row[] | null;
  const { data: counts } = await sb.from("quiz_questions").select("session_id").not("session_id", "is", null);
  const qc = new Map<string, number>(); for (const c of counts ?? []) if (c.session_id) qc.set(c.session_id, (qc.get(c.session_id) ?? 0) + 1);
  return (
    <>
      <p className="col-eyebrow">Admin · Content editor</p>
      <h1 className="lrn-title">Sessions</h1>
      <p className="lrn-muted" style={{ marginTop: 0 }}>Edit titles (English, Hinglish, हिंदी), the lesson body, video links, prompts and quizzes. Saves go live immediately, are compliance-scanned and audited. Re-running the seed overwrites edits made here.</p>
      <div className="lrn-table-wrap mt-4"><table className="col-table"><thead><tr><th>#</th><th className="col-text">Title</th><th>हिंदी</th><th>Video</th><th>Quiz</th><th>State</th><th>Edit</th></tr></thead><tbody>
        {(rows ?? []).map((r) => <tr key={r.id}><td className="col-num">{r.number}</td><td className="col-text">{r.title_en}</td><td style={{ textAlign: "center" }}>{r.title_dv ? "yes" : "—"}</td><td style={{ textAlign: "center" }}>{r.video_url ? "yes" : "—"}</td><td className="col-num">{qc.get(r.id) ?? 0}</td><td className="col-text">{[!r.is_published && "unpublished", r.is_draft && "draft"].filter(Boolean).join(", ") || "live"}</td><td style={{ textAlign: "center" }}><Link href={`/learn/admin/content/${r.number}`} className="col-btn col-btn--ghost col-btn--sm">Edit</Link></td></tr>)}
        {!rows?.length && <tr><td colSpan={7} className="col-text lrn-muted">Sessions are not in the database yet ({SESSIONS.length} in the content files). Run npm run db:seed.</td></tr>}
      </tbody></table></div>
    </>
  );
}

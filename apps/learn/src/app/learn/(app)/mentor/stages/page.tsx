export const dynamic = "force-dynamic";
import { requireViewer } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { StageRow } from "./StageRow";
import { Shield } from "@/components/ui/Icon";

/** Mentor/admin: grant WINNERS and O.N.E access per student (one login, per-stage unlock).
 *  The static pages on the VPS are gated by nginx against /api/gate/<stage>, which reads these rows. */
export default async function StageAccessPage() {
  if (!supabaseConfigured()) return <div className="col-card col-empty"><Shield size={36} strokeWidth={1.5} aria-hidden /><p className="col-empty__title">Stage access</p><p style={{ margin: 0 }}>Supabase connect hone ke baad yahan students ko WINNERS / O.N.E unlock kar sakte hain.</p></div>;
  await requireViewer(["mentor", "admin"]);
  const sb = await createClient();
  // RLS limits both queries to students this viewer may see (own cohorts, or everyone for admin).
  const [{ data: students }, { data: grants }, { data: visits }] = await Promise.all([
    sb.from("profiles").select("id,full_name,status").eq("role", "student").neq("status", "suspended").order("full_name"),
    sb.from("stage_access").select("user_id,stage,expires_at"),
    sb.from("stage_visits").select("user_id,stage,at").order("at", { ascending: false }).limit(200),
  ]);
  const lastVisit = new Map<string, string>();
  for (const x of visits ?? []) { const k = `${x.user_id}:${x.stage}`; if (!lastVisit.has(k)) lastVisit.set(k, x.at); }
  return (
    <>
      <p className="col-eyebrow">Mentor · Stage access</p>
      <h1 className="lrn-title">WINNERS &amp; O.N.E unlocks</h1>
      <p className="lrn-muted">Ek hi login, stage-wise unlock. Grant karte hi student apne SMART email-password se learn.optionlab.co.in/winners/ ya /one/ khol sakta hai (jab enforcement on hoga). Expiry blank = kabhi expire nahi.</p>
      <div className="col-card mt-4">
        <div className="lrn-table-wrap"><table className="col-table">
          <thead><tr><th className="col-text">Student</th><th className="col-text">CIRCLE W.I.N.N.E.R.S</th><th className="col-text">CIRCLE O.N.E</th></tr></thead>
          <tbody>
            {(students ?? []).map((s) => (
              <StageRow key={s.id} userId={s.id} name={s.full_name} grants={(grants ?? []).filter((g) => g.user_id === s.id)} />
            ))}
            {(students ?? []).length === 0 && <tr><td className="col-text lrn-muted" colSpan={3}>Koi student visible nahi. Admin se cohort assignment check karwaiye.</td></tr>}
          </tbody>
        </table></div>
      </div>
      {(visits ?? []).length > 0 && (
        <div className="col-card mt-4">
          <span className="col-eyebrow">Recent stage visits</span>
          <ul className="lrn-list mt-2">
            {(visits ?? []).slice(0, 20).map((x, i) => (
              <li key={i}><strong>{(students ?? []).find((s) => s.id === x.user_id)?.full_name ?? "—"}</strong> · {x.stage.toUpperCase()} · <span className="lrn-muted">{new Date(x.at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span></li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

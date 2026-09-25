export const dynamic = "force-dynamic";
import { requireViewer } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { StageRow, type GrantView } from "./StageRow";
import { fmtDate, fmtDateTime, isFuture, isPast, isoDayIST } from "@/components/admin/format";
import { Shield } from "@/components/ui/Icon";

/** Mentor/admin: grant WINNERS and O.N.E access per student (one login, per-stage unlock).
 *  The static pages on the VPS are gated by nginx against /api/gate/<stage>, which reads these rows. */
export default async function StageAccessPage() {
  if (!supabaseConfigured()) return <div className="col-card col-empty"><Shield size={36} strokeWidth={1.5} aria-hidden /><p className="col-empty__title">Stage access</p><p style={{ margin: 0 }}>Once the database is connected you can unlock WINNERS and O.N.E for students here.</p></div>;
  await requireViewer(["mentor", "admin"]);
  const sb = await createClient();
  // RLS limits every query to students this viewer may see (own cohorts, or everyone for admin).
  const [{ data: students }, { data: grants }, { data: visits }] = await Promise.all([
    sb.from("profiles").select("id,full_name,status").eq("role", "student").neq("status", "suspended").order("full_name"),
    sb.from("stage_access").select("user_id,stage,expires_at,starts_at,created_at"),
    sb.from("stage_visits").select("user_id,stage,at").order("at", { ascending: false }).limit(500),
  ]);
  const lastVisit = new Map<string, string>();
  for (const x of visits ?? []) { const k = `${x.user_id}:${x.stage}`; if (!lastVisit.has(k)) lastVisit.set(k, x.at); }
  // Status is decided here, on the server, so the row renders the same on the server and in the browser.
  const view = (g: { user_id: string; stage: string; starts_at: string | null; expires_at: string | null }): GrantView => ({
    stage: g.stage,
    state: isPast(g.expires_at) ? "expired" : isFuture(g.starts_at) ? "scheduled" : "active",
    starts: fmtDate(g.starts_at), ends: fmtDate(g.expires_at), startsDay: isoDayIST(g.starts_at), endsDay: isoDayIST(g.expires_at),
    lastOpened: fmtDateTime(lastVisit.get(`${g.user_id}:${g.stage}`)),
  });
  const nameOf = new Map((students ?? []).map((s) => [s.id, s.full_name]));
  return (
    <>
      <p className="col-eyebrow">Mentor · Stage access</p>
      <h1 className="lrn-title">WINNERS, W.I.N.N.E.R.S +, O.N.E &amp; PRO access</h1>
      <p className="lrn-muted">One sign-in, unlocked stage by stage. Once granted, the student opens learn.optionlab.co.in/winners/, /winners-plus/, /one/ or /pro/options/ with the same SMART email and password. Dates are IST; leave the end date blank for no expiry. Every grant, date change and revoke is logged.</p>
      <div className="col-card mt-4">
        <div className="lrn-table-wrap"><table className="col-table">
          <thead><tr><th className="col-text">Student</th><th className="col-text">CIRCLE W.I.N.N.E.R.S</th><th className="col-text">CIRCLE W.I.N.N.E.R.S +</th><th className="col-text">CIRCLE O.N.E</th><th className="col-text">CIRCLE PRO · Options 117</th></tr></thead>
          <tbody>
            {(students ?? []).map((s) => (
              <StageRow key={s.id} userId={s.id} name={s.full_name} grants={(grants ?? []).filter((g) => g.user_id === s.id).map(view)} />
            ))}
            {(students ?? []).length === 0 && <tr><td className="col-text lrn-muted" colSpan={5}>No students visible. If you are a mentor, ask an admin to assign you to the cohort.</td></tr>}
          </tbody>
        </table></div>
      </div>
      {(visits ?? []).length > 0 && (
        <div className="col-card mt-4">
          <span className="col-eyebrow">Recent stage visits (IST)</span>
          <ul className="lrn-list mt-2">
            {(visits ?? []).slice(0, 20).map((x, i) => (
              <li key={i}><strong>{nameOf.get(x.user_id) ?? "—"}</strong> · {x.stage === "one" ? "O.N.E" : x.stage === "pro_options" ? "PRO · Options 117" : x.stage === "winners_plus" ? "W.I.N.N.E.R.S +" : "WINNERS"} · <span className="lrn-muted">{fmtDateTime(x.at)}</span></li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

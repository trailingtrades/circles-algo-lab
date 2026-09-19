export const dynamic = "force-dynamic";
import { requireViewer } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/supabase/env";
import { RoleForm } from "@/components/admin/RoleForm";
import { fmtDateTime, isPast } from "@/components/admin/format";
import { Shield } from "@/components/ui/Icon";
import { isMasterAdmin } from "../master";

/** People & logins: every account with email, cohort, role, invite state and LAST SIGN-IN —
 *  who never logged in after their invite is visible at a glance. Role switch is master-only. */
export default async function PeoplePage() {
  if (!supabaseConfigured()) return <div className="col-card col-empty"><Shield size={36} strokeWidth={1.5} aria-hidden /><p className="col-empty__title">People &amp; logins</p><p style={{ margin: 0 }}>The login report appears here once the database is connected.</p></div>;
  const v = await requireViewer(["admin"]);
  const isMaster = isMasterAdmin(v.email);
  const admin = createAdminClient();
  const [{ data: profiles }, { data: cohorts }, { data: invites }] = await Promise.all([
    admin.from("profiles").select("id,full_name,role,status,cohort_id,joined_at").order("full_name"),
    admin.from("cohorts").select("id,name"),
    admin.from("invites").select("email,full_name,cohort_id,accepted_at,expires_at,created_at").order("created_at", { ascending: false }),
  ]);
  // Auth data (email + last sign-in), paged: listUsers returns at most 1000 per page.
  const auth = new Map<string, { email: string; last: string | null }>();
  for (let page = 1; page <= 50; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    for (const u of data?.users ?? []) auth.set(u.id, { email: u.email ?? "", last: u.last_sign_in_at ?? null });
    if ((data?.users.length ?? 0) < 1000) break;
  }
  const cohortName = new Map((cohorts ?? []).map((c) => [c.id, c.name]));
  const rows = (profiles ?? []).map((p) => ({ ...p, email: auth.get(p.id)?.email ?? "—", last: auth.get(p.id)?.last ?? null }))
    .sort((a, b) => (a.last ? 1 : 0) - (b.last ? 1 : 0) || (b.last ?? "").localeCompare(a.last ?? ""));
  // One line per person still waiting: the newest invite for an email that has no account yet (older invites were replaced).
  const hasAccount = new Set([...auth.values()].map((a) => a.email.toLowerCase()));
  const seen = new Set<string>();
  const pending = (invites ?? []).filter((i) => { const e = String(i.email).toLowerCase(); if (seen.has(e)) return false; seen.add(e); return !i.accepted_at && !hasAccount.has(e); });
  const neverCount = rows.filter((r) => !r.last).length;
  return (
    <>
      <p className="col-eyebrow">Admin · People</p>
      <h1 className="lrn-title">People &amp; logins</h1>
      <p className="lrn-muted">{rows.length} accounts · {neverCount} never signed in · {pending.length} waiting on an invite · {isMaster ? "you are the master admin and can change roles" : "only the master admin can change roles"}</p>
      <div className="col-card mt-4">
        <div className="lrn-table-wrap"><table className="col-table">
          <thead><tr><th className="col-text">Name</th><th className="col-text">Email</th><th className="col-text">Cohort</th><th className="col-text">Role</th><th className="col-text">Last sign-in (IST)</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="col-text"><strong>{r.full_name || "(no name)"}</strong>{r.status === "suspended" && <span className="col-chip" style={{ marginLeft: 6 }}>suspended</span>}</td>
                <td className="col-text lrn-num">{r.email}</td>
                <td className="col-text">{cohortName.get(r.cohort_id ?? "") ?? "—"}</td>
                <td className="col-text">{isMaster && r.id !== v.id ? <RoleForm userId={r.id} role={r.role} /> : r.role}</td>
                <td className="col-text">{fmtDateTime(r.last) ?? <span className="lrn-error">never</span>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="col-text lrn-muted">No accounts yet.</td></tr>}
          </tbody>
        </table></div>
      </div>
      {pending.length > 0 && (
        <div className="col-card mt-4">
          <span className="col-eyebrow">Invited, no account yet</span>
          <div className="lrn-table-wrap mt-2"><table className="col-table">
            <thead><tr><th className="col-text">Name</th><th className="col-text">Email</th><th className="col-text">Cohort</th><th className="col-text">Invited</th><th className="col-text">Link valid till</th></tr></thead>
            <tbody>
              {pending.map((i) => (
                <tr key={i.email}>
                  <td className="col-text">{i.full_name}</td>
                  <td className="col-text lrn-num">{i.email}</td>
                  <td className="col-text">{cohortName.get(i.cohort_id) ?? "—"}</td>
                  <td className="col-text">{fmtDateTime(i.created_at)}</td>
                  <td className="col-text">{isPast(i.expires_at) ? <span className="lrn-error">expired: send a new link from the cohort page</span> : fmtDateTime(i.expires_at)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </>
  );
}

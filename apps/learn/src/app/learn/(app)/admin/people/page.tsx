export const dynamic = "force-dynamic";
import { requireViewer } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/supabase/env";
import { RoleForm } from "@/components/admin/RoleForm";
import { Shield } from "@/components/ui/Icon";

const MASTER_ADMIN_EMAIL = (process.env.MASTER_ADMIN_EMAIL || "trailingtrades@gmail.com").toLowerCase();
const fmt = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : null);

/** People & logins: every account with email, cohort, role, invite state and LAST SIGN-IN —
 *  who never logged in after their invite is visible at a glance. Role switch is master-only. */
export default async function PeoplePage() {
  if (!supabaseConfigured()) return <div className="col-card col-empty"><Shield size={36} strokeWidth={1.5} aria-hidden /><p className="col-empty__title">People &amp; logins</p><p style={{ margin: 0 }}>Supabase connect hone ke baad yahan login report dikhegi.</p></div>;
  const v = await requireViewer(["admin"]);
  const isMaster = (v.email ?? "").toLowerCase() === MASTER_ADMIN_EMAIL;
  const admin = createAdminClient();
  const [{ data: profiles }, { data: cohorts }, { data: invites }] = await Promise.all([
    admin.from("profiles").select("id,full_name,role,status,cohort_id,joined_at").order("full_name"),
    admin.from("cohorts").select("id,name"),
    admin.from("invites").select("email,full_name,cohort_id,accepted_at,expires_at,created_at").order("created_at", { ascending: false }),
  ]);
  // Auth data (email + last sign-in) — one page of up to 1000 users covers the current scale.
  const { data: authList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const auth = new Map((authList?.users ?? []).map((u) => [u.id, { email: u.email ?? "", last: u.last_sign_in_at ?? null }]));
  const cohortName = new Map((cohorts ?? []).map((c) => [c.id, c.name]));
  const rows = (profiles ?? []).map((p) => ({ ...p, email: auth.get(p.id)?.email ?? "—", last: auth.get(p.id)?.last ?? null }))
    .sort((a, b) => (a.last ? 1 : 0) - (b.last ? 1 : 0) || (b.last ?? "").localeCompare(a.last ?? ""));
  const pending = (invites ?? []).filter((i) => !i.accepted_at);
  const neverCount = rows.filter((r) => !r.last).length;
  return (
    <>
      <p className="col-eyebrow">Admin · People</p>
      <h1 className="lrn-title">People &amp; logins</h1>
      <p className="lrn-muted">{rows.length} accounts · {neverCount} ne abhi tak login nahi kiya · {pending.length} invites pending{isMaster ? " · aap master admin hain (roles badal sakte hain)" : " · roles sirf master admin badal sakta hai"}</p>
      <div className="col-card mt-4">
        <div className="lrn-table-wrap"><table className="col-table">
          <thead><tr><th className="col-text">Name</th><th className="col-text">Email</th><th className="col-text">Cohort</th><th className="col-text">Role</th><th className="col-text">Last login</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="col-text"><strong>{r.full_name || "(no name)"}</strong>{r.status === "suspended" && <span className="col-chip" style={{ marginLeft: 6 }}>suspended</span>}</td>
                <td className="col-text lrn-num">{r.email}</td>
                <td className="col-text">{cohortName.get(r.cohort_id ?? "") ?? "—"}</td>
                <td className="col-text">{isMaster && r.id !== v.id ? <RoleForm userId={r.id} role={r.role} /> : r.role}</td>
                <td className="col-text">{fmt(r.last) ?? <span className="lrn-error">kabhi nahi</span>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="col-text lrn-muted">Koi account nahi.</td></tr>}
          </tbody>
        </table></div>
      </div>
      {pending.length > 0 && (
        <div className="col-card mt-4">
          <span className="col-eyebrow">Pending invites (account abhi nahi bana)</span>
          <div className="lrn-table-wrap mt-2"><table className="col-table">
            <thead><tr><th className="col-text">Name</th><th className="col-text">Email</th><th className="col-text">Cohort</th><th className="col-text">Sent</th><th className="col-text">Link valid till</th></tr></thead>
            <tbody>
              {pending.map((i, k) => (
                <tr key={k}>
                  <td className="col-text">{i.full_name}</td>
                  <td className="col-text lrn-num">{i.email}</td>
                  <td className="col-text">{cohortName.get(i.cohort_id) ?? "—"}</td>
                  <td className="col-text">{fmt(i.created_at)}</td>
                  <td className="col-text">{new Date(i.expires_at) < new Date() ? <span className="lrn-error">expired — reinvite bhejo</span> : fmt(i.expires_at)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </>
  );
}

export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { BulkInviteForm, RosterActions } from "@/components/admin/RosterForms";

export default async function CohortPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!supabaseConfigured()) notFound();
  await requireViewer(["admin"]);
  const sb = await createClient();
  const { data: cohort } = await sb.from("cohorts").select("id,name,level,starts_on").eq("id", id).maybeSingle();
  if (!cohort) notFound();
  const { data: members } = await sb.from("profiles").select("id,full_name,role,status,joined_at").eq("cohort_id", id).order("full_name");
  const { data: invites } = await sb.from("invites").select("id,email,full_name,expires_at,accepted_at,created_at").eq("cohort_id", id).order("created_at", { ascending: false });
  const { data: cohorts } = await sb.from("cohorts").select("id,name").order("name");
  const pending = (invites ?? []).filter((i) => !i.accepted_at);
  return (
    <>
      <p className="col-eyebrow">Admin · Cohort</p>
      <h1 className="lrn-title">{cohort.name}</h1>
      <p className="lrn-muted" style={{ marginTop: 0 }}>{cohort.level} · starts {cohort.starts_on} · {members?.length ?? 0} members · {pending.length} pending invites</p>
      <div className="lrn-grid mt-4">
        <section className="col-card" aria-labelledby="imp">
          <h2 id="imp" className="lrn-session__title">Bulk import students</h2>
          <p className="lrn-session__sub">Ek line mein ek student: <span className="lrn-num">Full Name, email</span>. CSV upload bhi chalega. Har student ko 7-din ka single-use invite link email hoga.</p>
          <BulkInviteForm cohortId={id} />
        </section>
        <section className="col-card" aria-labelledby="ros" style={{ gridColumn: "1 / -1" }}>
          <h2 id="ros" className="lrn-session__title">Roster</h2>
          <div className="lrn-table-wrap mt-3">
            <table className="col-table">
              <thead><tr><th className="col-text">Name</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
              <tbody>
                {members?.map((m) => (
                  <tr key={m.id}>
                    <td className="col-text">{m.full_name || "(no name)"}</td>
                    <td className="col-text">{m.role}</td>
                    <td className={`col-text lrn-status--${m.status}`}>{m.status}</td>
                    <td className="col-num">{m.joined_at ? new Date(m.joined_at).toLocaleDateString("en-IN") : "—"}</td>
                    <td><RosterActions userId={m.id} status={m.status} cohorts={cohorts ?? []} currentCohort={id} /></td>
                  </tr>
                ))}
                {!members?.length && <tr><td colSpan={5} className="col-text lrn-muted">Abhi koi member nahi.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="col-card" aria-labelledby="inv" style={{ gridColumn: "1 / -1" }}>
          <h2 id="inv" className="lrn-session__title">Invites</h2>
          <div className="lrn-table-wrap mt-3">
            <table className="col-table">
              <thead><tr><th className="col-text">Name</th><th className="col-text">Email</th><th>Expires</th><th>State</th><th>Actions</th></tr></thead>
              <tbody>
                {invites?.map((i) => {
                  const state = i.accepted_at ? "accepted" : new Date(i.expires_at) < new Date() ? "expired" : "pending";
                  return (
                    <tr key={i.id}>
                      <td className="col-text">{i.full_name}</td>
                      <td className="col-text lrn-num">{i.email}</td>
                      <td className="col-num">{new Date(i.expires_at).toLocaleDateString("en-IN")}</td>
                      <td className="col-text">{state}</td>
                      <td>{state !== "accepted" && <RosterActions inviteId={i.id} cohorts={[]} currentCohort={id} />}</td>
                    </tr>
                  );
                })}
                {!invites?.length && <tr><td colSpan={5} className="col-text lrn-muted">Abhi koi invite nahi.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

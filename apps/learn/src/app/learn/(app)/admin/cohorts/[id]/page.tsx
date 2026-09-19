export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { BulkInviteForm, RosterActions } from "@/components/admin/RosterForms";
import { CohortDatesForm } from "@/components/admin/CohortDatesForm";
import { CohortMentorForm } from "@/components/admin/CohortMentorForm";
import { fmtDate, isPast, isUuid, levelLabel } from "@/components/admin/format";
import { emailConfigured } from "@/lib/email/resend";

export default async function CohortPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!supabaseConfigured() || !isUuid(id)) notFound();
  await requireViewer(["admin"]);
  const sb = await createClient();
  const { data: cohort } = await sb.from("cohorts").select("id,name,level,starts_on,ends_on,mentor_id").eq("id", id).maybeSingle();
  if (!cohort) notFound();
  const [{ data: members }, { data: invites }, { data: cohorts }, { data: staff }] = await Promise.all([
    sb.from("profiles").select("id,full_name,role,status,joined_at").eq("cohort_id", id).order("full_name"),
    sb.from("invites").select("id,email,full_name,expires_at,accepted_at,created_at").eq("cohort_id", id).order("created_at", { ascending: false }),
    sb.from("cohorts").select("id,name").order("name"),
    sb.from("profiles").select("id,full_name,role").in("role", ["mentor", "admin"]).eq("status", "active").order("full_name"),
  ]);
  // Invites are listed newest first. Per email only the newest open one can still work (a new link expires the older ones),
  // so older rows read "replaced" and only the newest gets the New link button; an accepted email gets none.
  const accepted = new Set((invites ?? []).filter((i) => i.accepted_at).map((i) => i.email.toLowerCase()));
  const newest = new Set<string>();
  const inviteRows = (invites ?? []).map((i) => {
    const e = i.email.toLowerCase(); const first = !newest.has(e); newest.add(e);
    const state = i.accepted_at ? "accepted" : !first || accepted.has(e) ? "replaced" : isPast(i.expires_at) ? "expired" : "pending";
    return { ...i, state, canReissue: state === "pending" || state === "expired" };
  });
  const waiting = inviteRows.filter((i) => i.state === "pending").length;
  const mentor = (staff ?? []).find((m) => m.id === cohort.mentor_id);
  return (
    <>
      <p className="col-eyebrow">Admin · Cohort</p>
      <h1 className="lrn-title">{cohort.name}</h1>
      <p className="lrn-muted" style={{ marginTop: 0 }}>{levelLabel(cohort.level)} · {cohort.starts_on} to {cohort.ends_on ?? "open"} · {members?.length ?? 0} members · {waiting} open invites · {mentor ? `mentor ${mentor.full_name}` : "no mentor assigned"}</p>
      <div className="col-card mt-3" style={{ padding: 14, display: "grid", gap: 12 }}>
        <CohortDatesForm cohortId={cohort.id} startsOn={cohort.starts_on} endsOn={cohort.ends_on} />
        <CohortMentorForm cohortId={cohort.id} mentorId={cohort.mentor_id} mentors={staff ?? []} />
      </div>
      <div className="lrn-grid mt-4">
        <section className="col-card" aria-labelledby="imp">
          <h2 id="imp" className="lrn-session__title">Bulk import students</h2>
          <p className="lrn-session__sub">One student per line: <span className="lrn-num">Full Name, email</span>. A CSV upload or a two-column paste from a sheet also works. Each student gets a single-use invite link, valid 7 days. {emailConfigured() ? "Links are emailed." : "Email is not set up on this server, so the links are shown here for you to send yourself (for example on WhatsApp)."}</p>
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
                    <td className="col-num">{fmtDate(m.joined_at) ?? "—"}</td>
                    <td><RosterActions userId={m.id} status={m.status} cohorts={cohorts ?? []} currentCohort={id} /></td>
                  </tr>
                ))}
                {!members?.length && <tr><td colSpan={5} className="col-text lrn-muted">No members yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="col-card" aria-labelledby="inv" style={{ gridColumn: "1 / -1" }}>
          <h2 id="inv" className="lrn-session__title">Invites</h2>
          <div className="lrn-table-wrap mt-3">
            <table className="col-table">
              <thead><tr><th className="col-text">Name</th><th className="col-text">Email</th><th>Valid till</th><th>State</th><th>Actions</th></tr></thead>
              <tbody>
                {inviteRows.map((i) => (
                  <tr key={i.id}>
                    <td className="col-text">{i.full_name}</td>
                    <td className="col-text lrn-num">{i.email}</td>
                    <td className="col-num">{fmtDate(i.expires_at)}</td>
                    <td className="col-text">{i.state}</td>
                    <td>{i.canReissue && <RosterActions inviteId={i.id} cohorts={[]} currentCohort={id} />}</td>
                  </tr>
                ))}
                {!inviteRows.length && <tr><td colSpan={5} className="col-text lrn-muted">No invites yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

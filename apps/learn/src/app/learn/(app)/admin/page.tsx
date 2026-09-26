export const dynamic = "force-dynamic";
import Link from "next/link";
import { requireViewer } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/supabase/env";
import { fmtDateTime, daysAgoIso, daysAheadIso, levelLabel } from "@/components/admin/format";
import { payUrl } from "@/lib/payments";
import { Shield } from "@/components/ui/Icon";

/* Admin Overview: the numbers-first landing page for the Admin tab. Everything on it is a
   count(*) HEAD query (no rows leave the database), so it stays fast at any roster size —
   PostgREST caps row responses at 1000, which silently truncates list-based counting.
   Cohort management moved to /learn/admin/cohorts. */

// Academy ladder order (matches mentor/stages and the landing): every paid stage one row.
const PAID_STAGES = [
  { key: "funda", label: "CIRCLE F.U.N.D.A", stageNo: "Stage 2" },
  { key: "winners", label: "CIRCLE W.I.N.N.E.R.S", stageNo: "Stage 3" },
  { key: "winners_plus", label: "CIRCLE W.I.N.N.E.R.S +", stageNo: "Stage 3+" },
  { key: "one", label: "CIRCLE O.N.E", stageNo: "Stage 4" },
  { key: "pro_options", label: "CIRCLE PRO · Options 117", stageNo: "Stage 5" },
  { key: "pro_plus", label: "CIRCLE PRO+", stageNo: "Stage 5+" },
] as const;

export default async function AdminOverviewPage() {
  if (!supabaseConfigured()) return <Unconfigured />;
  await requireViewer(["admin"]);
  const admin = createAdminClient();
  const now = daysAheadIso(0);
  const in14 = daysAheadIso(14);
  const ago7 = daysAgoIso(7);
  const ago30 = daysAgoIso(30);

  const n = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const students = (status: string) =>
    n(admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").eq("status", status));
  const stageQ = (stage: string) => admin.from("stage_access").select("user_id", { count: "exact", head: true }).eq("stage", stage);

  const [
    active, invited, suspended,
    joined30, certs, invitesPending,
    actions7, exams7, visits7,
    grants, cohorts, audit,
  ] = await Promise.all([
    students("active"), students("invited"), students("suspended"),
    n(admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").gte("joined_at", ago30)),
    n(admin.from("certificates").select("id", { count: "exact", head: true }).eq("status", "issued")),
    n(admin.from("invites").select("id", { count: "exact", head: true }).is("accepted_at", null).gt("expires_at", now)),
    n(admin.from("score_events").select("id", { count: "exact", head: true }).gte("awarded_at", ago7)),
    n(admin.from("attempts").select("id", { count: "exact", head: true }).gte("submitted_at", ago7)),
    n(admin.from("stage_visits").select("id", { count: "exact", head: true }).gte("at", ago7)),
    Promise.all(PAID_STAGES.map(async (s) => ({
      ...s,
      pay: payUrl(s.key),
      activeN: await n(stageQ(s.key).or(`expires_at.is.null,expires_at.gt.${now}`).or(`starts_at.is.null,starts_at.lte.${now}`)),
      scheduled: await n(stageQ(s.key).gt("starts_at", now)),
      expiring: await n(stageQ(s.key).gt("expires_at", now).lte("expires_at", in14)),
      expired: await n(stageQ(s.key).lte("expires_at", now)),
      visits: await n(admin.from("stage_visits").select("id", { count: "exact", head: true }).eq("stage", s.key).gte("at", ago7)),
    }))),
    admin.from("cohorts").select("id,name,level,starts_on,is_active").order("starts_on", { ascending: false }).limit(50).then(async ({ data }) =>
      Promise.all((data ?? []).map(async (c) => ({
        ...c,
        studentsN: await n(admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").eq("cohort_id", c.id).neq("status", "suspended")),
      })))),
    admin.from("audit_log").select("id,action,target_type,at").order("at", { ascending: false }).limit(8).then((r) => r.data ?? []),
  ]);
  const paidActive = grants.reduce((t, g) => t + g.activeN, 0);

  return (
    <>
      <p className="col-eyebrow">Admin</p>
      <h1 className="lrn-title">Overview</h1>
      <p className="lrn-actions">
        <Link href="/learn/admin/cohorts" className="col-btn col-btn--ghost col-btn--sm">Cohorts</Link>
        <Link href="/learn/admin/people" className="col-btn col-btn--ghost col-btn--sm">People &amp; logins</Link>
        <Link href="/learn/mentor/stages" className="col-btn col-btn--ghost col-btn--sm">Stage access</Link>
        <Link href="/learn/admin/content" className="col-btn col-btn--ghost col-btn--sm">Content editor</Link>
        <Link href="/learn/admin/certificates" className="col-btn col-btn--ghost col-btn--sm">Certificates</Link>
        <Link href="/learn/admin/compliance" className="col-btn col-btn--ghost col-btn--sm">Compliance scan</Link>
      </p>

      <section aria-label="Enrolment" className="mt-4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <Tile label="Enrolled students" value={active} sub="active accounts" />
        <Tile label="Joined last 30 days" value={joined30} sub="new students" />
        <Tile label="Paid stage grants" value={paidActive} sub="active right now" />
        <Tile label="Invites pending" value={invitesPending + invited} sub={`${invited} invited · ${invitesPending} link out`} />
        <Tile label="Certificates issued" value={certs} sub="all stages" />
        <Tile label="Suspended" value={suspended} sub="blocked accounts" />
      </section>

      <section className="col-card mt-4" aria-labelledby="paid">
        <h2 id="paid" className="lrn-session__title">Paid courses — stage access</h2>
        <p className="lrn-muted" style={{ marginTop: 4 }}>Active = a grant that has started and not expired. Grant, extend or revoke on the <Link href="/learn/mentor/stages" className="lrn-link">Stage access</Link> page. Dates are IST.</p>
        <div className="lrn-table-wrap mt-2"><table className="col-table">
          <thead><tr><th className="col-text">Course</th><th className="col-text">Active</th><th className="col-text">Scheduled</th><th className="col-text">Ends ≤ 14 days</th><th className="col-text">Expired</th><th className="col-text">Opens, last 7 days</th><th className="col-text">Payment page</th></tr></thead>
          <tbody>
            {grants.map((g) => (
              <tr key={g.key}>
                <td className="col-text"><strong>{g.label}</strong><br /><span className="lrn-muted" style={{ fontSize: "var(--col-text-dense)" }}>{g.stageNo}</span></td>
                <td className="col-text lrn-num"><strong>{g.activeN}</strong></td>
                <td className="col-text lrn-num">{g.scheduled}</td>
                <td className="col-text lrn-num">{g.expiring > 0 ? <span className="lrn-error">{g.expiring}</span> : 0}</td>
                <td className="col-text lrn-num">{g.expired}</td>
                <td className="col-text lrn-num">{g.visits}</td>
                <td className="col-text">{g.pay ? <a className="lrn-link" href={g.pay} target="_blank" rel="noopener noreferrer">Razorpay live</a> : <span className="lrn-muted">WhatsApp enrolment</span>}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>

      <div className="lrn-grid mt-4">
        <section className="col-card" aria-labelledby="wk">
          <h2 id="wk" className="lrn-session__title">This week</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", fontSize: "var(--col-text-body-sm)" }}>
            <li style={{ minHeight: 32 }}><strong className="lrn-num">{actions7}</strong> learning actions (quiz, journal, attendance points)</li>
            <li style={{ minHeight: 32 }}><strong className="lrn-num">{exams7}</strong> quiz / exam submissions</li>
            <li style={{ minHeight: 32 }}><strong className="lrn-num">{visits7}</strong> paid-stage opens</li>
          </ul>
        </section>
        <section className="col-card" aria-labelledby="coh">
          <h2 id="coh" className="lrn-session__title">Students by cohort</h2>
          {cohorts.length ? (
            <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
              {cohorts.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2" style={{ minHeight: 36, borderBottom: "1px solid var(--col-dark-border)" }}>
                  <span><Link href={`/learn/admin/cohorts/${c.id}`} className="lrn-link">{c.name}</Link>{!c.is_active && <span className="lrn-muted"> (inactive)</span>}<br /><span className="lrn-muted" style={{ fontSize: "var(--col-text-dense)" }}>{levelLabel(c.level)} · {c.starts_on}</span></span>
                  <span className="lrn-num" style={{ textAlign: "right" }}><strong>{c.studentsN}</strong></span>
                </li>
              ))}
            </ul>
          ) : <p className="lrn-muted">No cohorts yet. <Link href="/learn/admin/cohorts" className="lrn-link">Create the first one.</Link></p>}
        </section>
        <section className="col-card" aria-labelledby="aud">
          <h2 id="aud" className="lrn-session__title">Recent admin actions</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", fontSize: "var(--col-text-body-sm)" }}>
            {audit.map((a) => <li key={a.id} className="lrn-num" style={{ minHeight: 32 }}>{fmtDateTime(a.at)} · {a.action} · {a.target_type}</li>)}
            {!audit.length && <li className="lrn-muted">The audit log is empty.</li>}
          </ul>
        </section>
      </div>
    </>
  );
}

function Tile({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="col-card" style={{ padding: "14px 16px" }}>
      <span className="col-eyebrow" style={{ display: "block" }}>{label}</span>
      <span className="lrn-num" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.2 }}>{value.toLocaleString("en-IN")}</span>
      <span className="lrn-muted" style={{ display: "block", fontSize: "var(--col-text-dense)" }}>{sub}</span>
    </div>
  );
}

function Unconfigured() {
  return (
    <div className="col-card col-empty">
      <Shield size={36} strokeWidth={1.5} aria-hidden />
      <p className="col-empty__title">Database not connected</p>
      <p style={{ margin: 0 }}>Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY, then apply supabase/migrations.</p>
    </div>
  );
}

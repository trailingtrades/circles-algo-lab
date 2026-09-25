export const dynamic = "force-dynamic";
import Link from "next/link";
import { requireViewer } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { CohortForm } from "@/components/admin/CohortForm";
import { levelLabel } from "@/components/admin/format";
import { Shield } from "@/components/ui/Icon";

/** Cohort management (create + list). Moved off /learn/admin so the admin landing page can be
 *  the numbers-first Overview dashboard; each cohort's own page stays at admin/cohorts/[id]. */
export default async function AdminCohortsPage() {
  if (!supabaseConfigured()) return <Unconfigured />;
  await requireViewer(["admin"]);
  const sb = await createClient();
  const [{ data: cohorts }, { data: staff }] = await Promise.all([
    sb.from("cohorts").select("id,name,level,starts_on,is_active,mentor_id").order("starts_on", { ascending: false }),
    sb.from("profiles").select("id,full_name,role").in("role", ["mentor", "admin"]).eq("status", "active").order("full_name"),
  ]);
  const mentorName = new Map((staff ?? []).map((m) => [m.id, m.full_name]));
  return (
    <>
      <p className="col-eyebrow">Admin · Cohorts</p>
      <h1 className="lrn-title">Cohorts</h1>
      <p className="lrn-actions"><Link href="/learn/admin" className="col-btn col-btn--ghost col-btn--sm">Overview</Link><Link href="/learn/admin/people" className="col-btn col-btn--ghost col-btn--sm">People &amp; logins</Link><Link href="/learn/mentor/stages" className="col-btn col-btn--ghost col-btn--sm">Stage access</Link></p>
      <div className="lrn-grid mt-4">
        <section className="col-card" aria-labelledby="new">
          <h2 id="new" className="lrn-session__title">New cohort</h2>
          <CohortForm mentors={staff ?? []} />
        </section>
        <section className="col-card" aria-labelledby="list">
          <h2 id="list" className="lrn-session__title">All cohorts</h2>
          {cohorts?.length ? (
            <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
              {cohorts.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2" style={{ minHeight: 44, borderBottom: "1px solid var(--col-dark-border)" }}>
                  <span><Link href={`/learn/admin/cohorts/${c.id}`} className="lrn-link">{c.name}</Link>{!c.is_active && <span className="lrn-muted"> (inactive)</span>}<br /><span className="lrn-muted" style={{ fontSize: "var(--col-text-dense)" }}>{c.mentor_id ? `Mentor: ${mentorName.get(c.mentor_id) ?? "not active"}` : "No mentor"}</span></span>
                  <span className="lrn-muted lrn-num" style={{ fontSize: "var(--col-text-body-sm)", textAlign: "right" }}>{levelLabel(c.level)}<br />{c.starts_on}</span>
                </li>
              ))}
            </ul>
          ) : <p className="lrn-muted">No cohorts yet. Create the first one, then import its students.</p>}
        </section>
      </div>
    </>
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

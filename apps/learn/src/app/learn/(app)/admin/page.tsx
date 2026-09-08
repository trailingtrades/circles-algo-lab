export const dynamic = "force-dynamic";
import Link from "next/link";
import { requireViewer } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { CohortForm } from "@/components/admin/CohortForm";
import { Shield } from "@/components/ui/Icon";

export default async function AdminPage() {
  if (!supabaseConfigured()) return <Unconfigured />;
  await requireViewer(["admin"]);
  const sb = await createClient();
  const { data: cohorts } = await sb.from("cohorts").select("id,name,level,starts_on,is_active").order("starts_on", { ascending: false });
  const { data: audit } = await sb.from("audit_log").select("id,action,target_type,at").order("at", { ascending: false }).limit(10);
  return (
    <>
      <p className="col-eyebrow">Admin</p>
      <h1 className="lrn-title">Cohorts</h1>
      <div className="lrn-grid mt-4">
        <section className="col-card" aria-labelledby="new">
          <h2 id="new" className="lrn-session__title">New cohort</h2>
          <CohortForm />
        </section>
        <section className="col-card" aria-labelledby="list">
          <h2 id="list" className="lrn-session__title">All cohorts</h2>
          {cohorts?.length ? (
            <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
              {cohorts.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2" style={{ minHeight: 44, borderBottom: "1px solid var(--col-dark-border)" }}>
                  <Link href={`/learn/admin/cohorts/${c.id}`} className="lrn-link">{c.name}</Link>
                  <span className="col-chip">{c.level} · {c.starts_on}</span>
                </li>
              ))}
            </ul>
          ) : <p className="lrn-muted">Abhi koi cohort nahi. Pehla cohort banaiye, phir students import kijiye.</p>}
        </section>
        <section className="col-card" aria-labelledby="aud">
          <h2 id="aud" className="lrn-session__title">Recent admin actions</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", fontSize: "var(--col-text-body-sm)" }}>
            {audit?.map((a) => <li key={a.id} className="lrn-num" style={{ minHeight: 32 }}>{new Date(a.at).toLocaleString("en-IN")} · {a.action} · {a.target_type}</li>)}
            {!audit?.length && <li className="lrn-muted">Audit log khali hai.</li>}
          </ul>
        </section>
      </div>
    </>
  );
}

function Unconfigured() {
  return (
    <div className="col-card col-empty">
      <Shield size={36} strokeWidth={1.5} aria-hidden />
      <p className="col-empty__title">Supabase project not connected</p>
      <p style={{ margin: 0 }}>Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY, then apply supabase/migrations.</p>
    </div>
  );
}

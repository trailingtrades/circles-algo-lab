export const dynamic = "force-dynamic";
import { requireViewer } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { GradeForm } from "./GradeForm";
import { Shield } from "@/components/ui/Icon";

/** Mentor: cohort roster, per-student progress, ungraded artefacts, at-risk list, full ranking (teaching tool, §10.9). */
export default async function MentorPage() {
  if (!supabaseConfigured()) return <div className="col-card col-empty"><Shield size={36} strokeWidth={1.5} aria-hidden /><p className="col-empty__title">Mentor dashboard</p><p style={{ margin: 0 }}>Supabase project connect hone ke baad cohort roster, ungraded artefacts aur at-risk list yahan dikhengi.</p></div>;
  const v = await requireViewer(["mentor", "admin"]);
  const sb = await createClient();
  const { data: cohorts } = await sb.from("cohorts").select("id,name,level").eq("is_active", true).order("starts_on", { ascending: false });
  const mine = (cohorts ?? []).filter(() => true);
  const out = [];
  for (const c of mine) {
    const { data: lv } = await sb.from("levels").select("id").eq("slug", c.level).single();
    const [{ data: students }, { data: ranking }, { data: rows }, { data: grades }, { data: journals }, { data: fails }] = await Promise.all([
      sb.from("profiles").select("id,full_name,status,joined_at").eq("cohort_id", c.id).eq("role", "student"),
      sb.rpc("board_full", { p_cohort: c.id, p_level: lv!.id }),
      sb.from("portfolio_rows").select("id,user_id,symbol,full_why,full_why_2,top_risk,risk_answer,price_stop,why_stop,review_point"),
      sb.from("practice_grades").select("ref_id,user_id"),
      sb.from("journal_entries").select("user_id,created_at"),
      sb.from("attempts").select("user_id,exam_id,passed").not("exam_id", "is", null).eq("passed", false),
    ]);
    const ids = new Set((students ?? []).map((s) => s.id));
    const ungraded = (rows ?? []).filter((r) => ids.has(r.user_id) && r.full_why && r.full_why_2 && r.top_risk && r.risk_answer && r.price_stop && r.why_stop && r.review_point && !(grades ?? []).some((g) => g.ref_id === r.id));
    const week = new Date().getTime() - 7 * 86400e3;
    const atRisk = (students ?? []).filter((s) => { const j = (journals ?? []).filter((x) => x.user_id === s.id); const failed = (fails ?? []).filter((x) => x.user_id === s.id); const failedTwice = new Set(failed.map((x) => x.exam_id)).size > 0 && failed.length >= 2; return j.length === 0 || failedTwice || !j.some((x) => new Date(x.created_at).getTime() > week); }).map((s) => ({ ...s, why: [(journals ?? []).filter((x) => x.user_id === s.id).length === 0 && "zero journal entries", !(journals ?? []).some((x) => x.user_id === s.id && new Date(x.created_at).getTime() > week) && "no activity 7 days", (fails ?? []).filter((x) => x.user_id === s.id).length >= 2 && "failed exam twice"].filter(Boolean).join(" · ") }));
    out.push({ c, students: students ?? [], ranking: (ranking ?? []) as { rank: number; full_name: string; total: number }[], ungraded, atRisk, names: new Map((students ?? []).map((s) => [s.id, s.full_name])) });
  }
  return (
    <>
      <p className="col-eyebrow">Mentor · {v.full_name}</p>
      <h1 className="lrn-title">Cohorts</h1>
      {out.length === 0 && <p className="lrn-muted">Aapko abhi koi cohort assign nahi hai. Admin se kahiye cohort par mentor set kare.</p>}
      {out.map(({ c, students, ranking, ungraded, atRisk, names }) => (
        <section key={c.id} className="mt-4" aria-labelledby={`m-${c.id}`}>
          <h2 id={`m-${c.id}`} className="lrn-title" style={{ fontSize: 20 }}>{c.name} <span className="col-chip">{c.level}</span></h2>
          <div className="lrn-grid">
            <div className="col-card"><span className="col-eyebrow">At-risk ({atRisk.length})</span><ul className="lrn-list mt-2">{atRisk.map((s) => <li key={s.id}><strong>{s.full_name}</strong> <span className="lrn-muted" style={{ fontSize: "var(--col-text-dense)" }}>{s.why}</span></li>)}{atRisk.length === 0 && <li className="lrn-muted">Koi nahi. Achha hai.</li>}</ul></div>
            <div className="col-card"><span className="col-eyebrow">Full ranking (mentor view, {students.length} students)</span>
              <div className="lrn-table-wrap mt-2"><table className="col-table"><thead><tr><th>#</th><th className="col-text">Student</th><th>Process Score</th></tr></thead><tbody>{ranking.map((r) => <tr key={r.rank + r.full_name}><td className="col-num">{r.rank}</td><td className="col-text">{r.full_name}</td><td className="col-num">{r.total}</td></tr>)}</tbody></table></div></div>
            <div className="col-card" style={{ gridColumn: "1 / -1" }}><span className="col-eyebrow">Ungraded artefacts ({ungraded.length})</span>
              <div className="lrn-list mt-2">{ungraded.map((r) => (
                <details key={r.id} className="col-card__inner lrn-bar"><summary style={{ cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center", gap: 8 }}><strong>{names.get(r.user_id)}</strong> · <span className="lrn-num">{r.symbol}</span> <span className="lrn-virtual">virtual</span></summary>
                  <dl className="lrn-dl"><dt>Full Why 1</dt><dd>{r.full_why}</dd><dt>Full Why 2</dt><dd>{r.full_why_2}</dd><dt>Top risk</dt><dd>{r.top_risk}</dd><dt>Answer</dt><dd>{r.risk_answer}</dd><dt>Price-stop</dt><dd className="lrn-num">{r.price_stop}</dd><dt>Why-stop</dt><dd>{r.why_stop}</dd><dt>Review point</dt><dd>{r.review_point}</dd></dl>
                  <GradeForm userId={r.user_id} refId={r.id} artefact="full_why" /></details>))}{ungraded.length === 0 && <p className="lrn-muted">Sab graded.</p>}</div></div>
          </div>
        </section>
      ))}
    </>
  );
}

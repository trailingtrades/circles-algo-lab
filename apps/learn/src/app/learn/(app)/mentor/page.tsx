export const dynamic = "force-dynamic";
import { requireViewer } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import Link from "next/link";
import { GradeForm, type LadderItem } from "./GradeForm";
import { daysAgoIso, fmtDate, levelLabel } from "@/components/admin/format";
import { Shield } from "@/components/ui/Icon";

type Grade = { id: string; ref_id: string | null; user_id: string; artefact: string; process_grade: string; outcome_sign: string | null; feedback: string | null; graded_at: string };
const PORTFOLIO_FIELDS = ["full_why", "full_why_2", "top_risk", "risk_answer", "price_stop", "why_stop", "review_point"] as const;

/** Mentor: cohort roster, ungraded and graded artefacts, at-risk list, full ranking (teaching tool, §10.9).
 *  Mentors see the cohorts assigned to them; admins see every active cohort. Every query is limited to that cohort's students. */
export default async function MentorPage() {
  if (!supabaseConfigured()) return <div className="col-card col-empty"><Shield size={36} strokeWidth={1.5} aria-hidden /><p className="col-empty__title">Mentor dashboard</p><p style={{ margin: 0 }}>The cohort roster, ungraded work and at-risk list appear here once the database is connected.</p></div>;
  const v = await requireViewer(["mentor", "admin"]);
  const sb = await createClient();
  const [{ data: cohorts }, { data: levels }, { data: ladderRows }] = await Promise.all([
    sb.from("cohorts").select("id,name,level,mentor_id").eq("is_active", true).order("starts_on", { ascending: false }),
    sb.from("levels").select("id,slug"),
    sb.from("artefact_ladder").select("level_slug,artefact,title"),
  ]);
  const levelId = new Map((levels ?? []).map((l) => [l.slug, l.id]));
  const ladderOf = (slug: string): LadderItem[] => (ladderRows ?? []).filter((a) => a.level_slug === slug).map((a) => ({ artefact: a.artefact, title: a.title }));
  const mine = (cohorts ?? []).filter((c) => v.role === "admin" || c.mentor_id === v.id);
  const weekAgo = daysAgoIso(7);

  const out = await Promise.all(mine.map(async (c) => {
    const lvId = levelId.get(c.level);
    const { data: studentRows } = await sb.from("profiles").select("id,full_name,status").eq("cohort_id", c.id).eq("role", "student").order("full_name");
    const students = studentRows ?? []; const ids = students.map((s) => s.id);
    if (!lvId || ids.length === 0) return { c, students, ranking: [], ungraded: [], graded: [], atRisk: [], grades: [] as Grade[], ladder: ladderOf(c.level) };
    const [{ data: ranking }, { data: rows }, { data: grades }, { data: recent }, { data: fails }] = await Promise.all([
      sb.rpc("board_full", { p_cohort: c.id, p_level: lvId }),
      c.level === "foundation" ? sb.from("portfolio_rows").select("id,user_id,symbol,full_why,full_why_2,top_risk,risk_answer,price_stop,why_stop,review_point").in("user_id", ids) : Promise.resolve({ data: [] as Record<string, string>[] }),
      sb.from("practice_grades").select("id,ref_id,user_id,artefact,process_grade,outcome_sign,feedback,graded_at").in("user_id", ids).eq("level_id", lvId),
      sb.from("journal_entries").select("user_id").in("user_id", ids).gte("created_at", weekAgo),
      sb.from("attempts").select("user_id,exam_id").in("user_id", ids).not("exam_id", "is", null).eq("passed", false),
    ]);
    // At-risk: no journal entry in 7 days (and whether they ever wrote one), or the SAME exam failed twice.
    const active = new Set((recent ?? []).map((j) => j.user_id));
    const quiet = ids.filter((id) => !active.has(id));
    const ever = new Map(await Promise.all(quiet.map(async (id) => [id, ((await sb.from("journal_entries").select("id", { count: "exact", head: true }).eq("user_id", id)).count ?? 0) > 0] as const)));
    const failCount = new Map<string, number>(); for (const f of fails ?? []) { const k = `${f.user_id}:${f.exam_id}`; failCount.set(k, (failCount.get(k) ?? 0) + 1); }
    const failedTwice = new Set([...failCount].filter(([, n]) => n >= 2).map(([k]) => k.split(":")[0]));
    const atRisk = students.map((s) => ({ ...s, why: [quiet.includes(s.id) && (ever.get(s.id) ? "no journal entry in 7 days" : "no journal entries yet"), failedTwice.has(s.id) && "failed the same exam twice"].filter(Boolean).join(" · ") })).filter((s) => s.why);
    const g = (grades ?? []) as Grade[]; const byRef = new Map(g.filter((x) => x.ref_id).map((x) => [x.ref_id!, x]));
    const complete = (rows ?? []).filter((r) => PORTFOLIO_FIELDS.every((f) => r[f]));
    return { c, students, ranking: (ranking ?? []) as { rank: number; full_name: string; total: number }[], ungraded: complete.filter((r) => !byRef.has(r.id)), graded: complete.filter((r) => byRef.has(r.id)).map((r) => ({ r, grade: byRef.get(r.id)! })), atRisk, grades: g, ladder: ladderOf(c.level) };
  }));

  return (
    <>
      <p className="col-eyebrow">Mentor · {v.full_name}</p>
      <h1 className="lrn-title">Cohorts</h1>
      <p className="mt-2"><Link href="/learn/mentor/stages" className="lrn-link">Stage access (WINNERS, O.N.E)</Link></p>
      {out.length === 0 && <p className="lrn-muted">No cohort is assigned to you yet. An admin sets the mentor on the cohort page.</p>}
      {out.map(({ c, students, ranking, ungraded, graded, atRisk, grades, ladder }) => {
        const names = new Map(students.map((s) => [s.id, s.full_name]));
        return (
          <section key={c.id} className="mt-4" aria-labelledby={`m-${c.id}`}>
            <h2 id={`m-${c.id}`} className="lrn-title" style={{ fontSize: 20 }}>{c.name} <span className="lrn-muted" style={{ fontSize: "var(--col-text-body-sm)", fontWeight: 400 }}>{levelLabel(c.level)} · {students.length} students</span></h2>
            <div className="lrn-grid">
              <div className="col-card"><span className="col-eyebrow">At risk ({atRisk.length})</span><ul className="lrn-list mt-2">{atRisk.map((s) => <li key={s.id}><strong>{s.full_name}</strong> <span className="lrn-muted" style={{ fontSize: "var(--col-text-dense)" }}>{s.why}</span></li>)}{atRisk.length === 0 && <li className="lrn-muted">Nobody at risk right now.</li>}</ul></div>
              <div className="col-card"><span className="col-eyebrow">Full ranking (mentor view)</span>
                <div className="lrn-table-wrap mt-2"><table className="col-table"><thead><tr><th>#</th><th className="col-text">Student</th><th>Process Score</th></tr></thead><tbody>{ranking.map((r) => <tr key={r.rank + r.full_name}><td className="col-num">{r.rank}</td><td className="col-text">{r.full_name}</td><td className="col-num">{r.total}</td></tr>)}{ranking.length === 0 && <tr><td colSpan={3} className="col-text lrn-muted">No scores yet.</td></tr>}</tbody></table></div></div>
              {c.level === "foundation" ? (
                <div className="col-card" style={{ gridColumn: "1 / -1" }}><span className="col-eyebrow">Portfolio rows to grade ({ungraded.length})</span>
                  <div className="lrn-list mt-2">{ungraded.map((r) => (
                    <details key={r.id} className="col-card__inner lrn-bar"><summary style={{ cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center", gap: 8 }}><strong>{names.get(r.user_id)}</strong> · <span className="lrn-num">{r.symbol}</span> <span className="lrn-virtual">virtual</span></summary>
                      <PortfolioRow r={r} />
                      <GradeForm userId={r.user_id} refId={r.id} ladder={ladder} /></details>))}{ungraded.length === 0 && <p className="lrn-muted">Everything submitted is graded.</p>}</div>
                  {graded.length > 0 && (
                    <details className="mt-3"><summary className="lrn-muted" style={{ cursor: "pointer" }}>Graded rows ({graded.length}), open one to regrade</summary>
                      <div className="lrn-list mt-2">{graded.map(({ r, grade }) => (
                        <details key={r.id} className="col-card__inner lrn-bar"><summary style={{ cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center", gap: 8 }}><strong>{names.get(r.user_id)}</strong> · <span className="lrn-num">{r.symbol}</span> · grade {grade.process_grade} <span className="lrn-muted">{fmtDate(grade.graded_at)}</span></summary>
                          <PortfolioRow r={r} />
                          <GradeForm userId={r.user_id} refId={r.id} ladder={ladder} current={{ grade: grade.process_grade, outcome: grade.outcome_sign, feedback: grade.feedback }} /></details>))}</div>
                    </details>
                  )}
                </div>
              ) : (
                <div className="col-card" style={{ gridColumn: "1 / -1" }}><span className="col-eyebrow">Artefact grades</span>
                  <p className="lrn-session__sub">One grade per artefact per student: {ladder.map((a) => a.title).join(" · ") || "no artefacts set up"}. Grade the work the student submitted to you; pick the artefact in the form.</p>
                  <div className="lrn-list mt-2">{students.map((s) => {
                    const mineG = grades.filter((x) => x.user_id === s.id && !x.ref_id);
                    return (
                      <details key={s.id} className="col-card__inner lrn-bar"><summary style={{ cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><strong>{s.full_name}</strong> <span className="lrn-muted" style={{ fontSize: "var(--col-text-dense)" }}>{ladder.map((a) => `${a.title}: ${mineG.find((x) => x.artefact === a.artefact)?.process_grade ?? "not graded"}`).join(" · ")}</span></summary>
                        <GradeForm userId={s.id} refId={null} ladder={ladder} /></details>
                    );
                  })}{students.length === 0 && <p className="lrn-muted">No students in this cohort yet.</p>}</div>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </>
  );
}

function PortfolioRow({ r }: { r: Record<string, string> }) {
  return <dl className="lrn-dl"><dt>Full Why 1</dt><dd>{r.full_why}</dd><dt>Full Why 2</dt><dd>{r.full_why_2}</dd><dt>Top risk</dt><dd>{r.top_risk}</dd><dt>Answer</dt><dd>{r.risk_answer}</dd><dt>Price-stop</dt><dd className="lrn-num">{r.price_stop}</dd><dt>Why-stop</dt><dd>{r.why_stop}</dd><dt>Review point</dt><dd>{r.review_point}</dd></dl>;
}

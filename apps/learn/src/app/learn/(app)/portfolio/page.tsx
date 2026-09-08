export const dynamic = "force-dynamic";
import Link from "next/link";
import { getViewer, createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { RowForm, DeleteButton } from "./RowForm";
import { IndianRupee } from "@/components/ui/Icon";
import { TIER2 } from "@/lib/compliance/strings";

export interface Row { id: string; symbol: string; full_why: string; full_why_2: string; top_risk: string; risk_answer: string; price_stop: number | null; why_stop: string; review_point: string; entry_date: string | null; qty: number | null; entry_price: number | null }
const complete = (r: Row) => !!(r.full_why && r.full_why_2 && r.top_risk && r.risk_answer && r.price_stop && r.why_stop && r.review_point);

/** Mock portfolio: Rs 10 lakh virtual. Every screen here carries VIRTUAL. No prices are fetched; no P&L is computed or shown (§7, §16). */
export default async function PortfolioPage() {
  const v = supabaseConfigured() ? await getViewer() : null;
  let rows: Row[] = []; let grades: { ref_id: string | null; process_grade: string; outcome_sign: string | null; feedback: string | null }[] = [];
  if (v) { const sb = await createClient(); rows = ((await sb.from("portfolio_rows").select("*").eq("user_id", v.id).order("created_at")).data ?? []) as Row[]; grades = (await sb.from("practice_grades").select("ref_id,process_grade,outcome_sign,feedback").eq("user_id", v.id)).data ?? []; }
  else rows = [{ id: "demo", symbol: "DEMO", full_why: "Business reason one (demo)", full_why_2: "", top_risk: "", risk_answer: "", price_stop: null, why_stop: "", review_point: "", entry_date: null, qty: null, entry_price: null }];
  const done = rows.filter(complete).length;
  return (
    <>
      <div className="flex items-center gap-3 flex-wrap"><h1 className="lrn-title" style={{ margin: 0 }}>Mock portfolio</h1><span className="lrn-virtual">VIRTUAL — no real money</span></div>
      <p className="lrn-muted" style={{ marginTop: 4 }}>Rs 10,00,000 virtual. Watchlist max 5 rows. Har row ko Full Why x2, top risk + answer, price-stop, Why-stop aur review point chahiye — tabhi wo artefact ginti hai. Koi live price nahi, koi P&L nahi: grading process ki hoti hai.</p>
      <div className="lrn-grid mt-4">
        <section className="col-card" aria-label="Artefact progress">
          <span className="col-eyebrow">Foundation artefact</span>
          <p className="lrn-num" style={{ fontSize: 32, fontWeight: 600, margin: "4px 0" }}>{done} <span style={{ fontSize: 14, fontWeight: 500 }}>/ 5 complete rows</span></p>
          <p className="lrn-session__sub">Mentor grades each complete row on process (A–F). Outcome (+/−) is shown separately and never scored.</p>
          <Link href="/learn/session/5" className="col-btn col-btn--ghost col-btn--sm mt-3">Friday review journal</Link>
        </section>
        <section className="col-card" aria-label="New row"><span className="col-eyebrow">{rows.length < 5 ? "Add a row" : "Watchlist full"}</span>{rows.length < 5 && <RowForm />}</section>
      </div>
      <h2 className="col-eyebrow mt-6 mb-3">Watchlist · VIRTUAL</h2>
      <div className="lrn-list">
        {rows.map((r) => { const g = grades.find((x) => x.ref_id === r.id); return (
          <details key={r.id} className="col-card lrn-row">
            <summary className="flex items-center justify-between gap-2 flex-wrap" style={{ cursor: "pointer", minHeight: 44 }}>
              <span className="flex items-center gap-2"><IndianRupee size={16} aria-hidden /><strong className="lrn-num">{r.symbol}</strong><span className="lrn-virtual">virtual</span></span>
              <span className="flex items-center gap-2 flex-wrap"><span className={`col-chip ${complete(r) ? "col-chip--up" : ""}`}>{complete(r) ? "Complete" : "Incomplete"}</span>{g && <span className="col-chip">Process {g.process_grade}</span>}{g?.outcome_sign && <span className="col-chip">Outcome {g.outcome_sign}</span>}</span>
            </summary>
            {g?.feedback && <p className="lrn-notice mt-2">Mentor: {g.feedback}</p>}
            <RowForm row={r} /><DeleteButton id={r.id} />
          </details>); })}
      </div>
      <p className="lrn-muted mt-4" style={{ fontSize: "var(--col-text-dense)" }}>{TIER2}</p>
    </>
  );
}

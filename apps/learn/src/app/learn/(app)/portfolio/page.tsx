export const dynamic = "force-dynamic";
import Link from "next/link";
import { getViewer, createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { getLang } from "@/lib/i18n/server";
import { t3, tr } from "@/lib/i18n/lang";
import { T } from "@/lib/i18n/strings";
import { RowForm, DeleteButton } from "./RowForm";
import { IndianRupee } from "@/components/ui/Icon";
import { TIER2 } from "@/lib/compliance/strings";

export interface Row { id: string; symbol: string; full_why: string; full_why_2: string; top_risk: string; risk_answer: string; price_stop: number | null; why_stop: string; review_point: string; entry_date: string | null; qty: number | null; entry_price: number | null }
const complete = (r: Row) => !!(r.full_why && r.full_why_2 && r.top_risk && r.risk_answer && r.price_stop && r.why_stop && r.review_point);

const S = {
  title: t3("Mock portfolio", "Mock portfolio", "मॉक पोर्टफ़ोलियो"),
  intro: t3("Rs 10,00,000 of virtual money and up to 5 Portfolio rows. A row counts as practice work only when every field is filled: two Full Whys, the top risk and your answer to it, a price-stop, a Why-stop and a review point. There are no live prices and no profit or loss here. Your mentor grades the process.", "Rs 10,00,000 virtual paisa aur zyada se zyada 5 Portfolio rows. Row tabhi practice kaam mein ginti hai jab saare fields bhare hon: do Full Why, sabse bada risk aur uska jawab, price-stop, Why-stop aur review point. Yahan koi live price nahi, koi profit ya loss nahi. Mentor aapke process ko grade karte hain.", "Rs 10,00,000 का वर्चुअल पैसा और ज़्यादा से ज़्यादा 5 Portfolio रो। रो तभी प्रैक्टिस काम में गिनी जाती है जब सारे फ़ील्ड भरे हों: दो फ़ुल व्हाई, सबसे बड़ा जोखिम और उसका जवाब, प्राइस-स्टॉप, व्हाई-स्टॉप और रिव्यू पॉइंट। यहाँ कोई लाइव कीमत नहीं, कोई मुनाफ़ा या नुकसान नहीं। मेंटर आपके प्रोसेस को ग्रेड करते हैं।"),
  practice: t3("Practice work", "Practice kaam", "प्रैक्टिस काम"),
  rowsDone: t3("rows complete", "rows poori", "रो पूरी"),
  grading: t3("Your mentor grades each complete row on process, A to F. The outcome (+ or −) is shown separately and never scored.", "Mentor har poori row ko process par A se F tak grade karte hain. Outcome (+ ya −) alag dikhta hai aur uske number nahi milte.", "मेंटर हर पूरी रो को प्रोसेस पर A से F तक ग्रेड करते हैं। नतीजा (+ या −) अलग दिखता है और उसके अंक नहीं मिलते।"),
  review: t3("Weekly review is on your Path", "Weekly review aapke Path par hai", "साप्ताहिक रिव्यू आपके पाथ पर है"),
  add: t3("Add a row", "Nayi row jodiye", "नई रो जोड़ें"),
  full: t3("Portfolio rows full (5 of 5)", "Portfolio rows bhar gayi (5/5)", "Portfolio रो भर गईं (5/5)"),
  yourRows: t3("Your Portfolio rows", "Aapki Portfolio rows", "आपकी Portfolio रो"),
  none: t3("No rows yet. Add your first one above.", "Abhi koi row nahi. Upar se pehli row jodiye.", "अभी कोई रो नहीं। ऊपर से पहली रो जोड़िए।"),
  virtual: t3("virtual", "virtual", "वर्चुअल"),
  complete: t3("Complete", "Poori", "पूरी"),
  incomplete: t3("Incomplete", "Adhoori", "अधूरी"),
  process: t3("Process", "Process", "प्रोसेस"),
  outcome: t3("Outcome", "Outcome", "नतीजा"),
  mentor: t3("Mentor", "Mentor", "मेंटर"),
  demoWhy: t3("Example reason (preview)", "Example reason (preview)", "उदाहरण कारण (प्रीव्यू)"),
};

/** Mock portfolio: Rs 10 lakh virtual. Every screen here carries VIRTUAL. No prices are fetched; no P&L is computed or shown (§7, §16). */
export default async function PortfolioPage() {
  const v = supabaseConfigured() ? await getViewer() : null;
  const lang = await getLang(v?.lang);
  let rows: Row[] = []; let grades: { ref_id: string | null; process_grade: string; outcome_sign: string | null; feedback: string | null }[] = [];
  if (v) { const sb = await createClient(); rows = ((await sb.from("portfolio_rows").select("*").eq("user_id", v.id).order("created_at")).data ?? []) as Row[]; grades = (await sb.from("practice_grades").select("ref_id,process_grade,outcome_sign,feedback").eq("user_id", v.id)).data ?? []; }
  else rows = [{ id: "demo", symbol: "DEMO", full_why: tr(S.demoWhy, lang), full_why_2: "", top_risk: "", risk_answer: "", price_stop: null, why_stop: "", review_point: "", entry_date: null, qty: null, entry_price: null }];
  const done = rows.filter(complete).length;
  return (
    <>
      <div className="flex items-center gap-3 flex-wrap"><h1 className="lrn-title" style={{ margin: 0 }}>{tr(S.title, lang)}</h1><span className="lrn-virtual">{tr(T.virtual, lang)}</span></div>
      <p className="lrn-muted" style={{ marginTop: 4 }}>{tr(S.intro, lang)}</p>
      <div className="lrn-grid mt-4">
        <section className="col-card" aria-labelledby="pf-progress">
          <h2 id="pf-progress" className="col-eyebrow" style={{ margin: 0 }}>{tr(S.practice, lang)}</h2>
          <p className="lrn-num" style={{ fontSize: 32, fontWeight: 600, margin: "4px 0" }}>{done} / 5 <span style={{ fontSize: 14, fontWeight: 500 }}>{tr(S.rowsDone, lang)}</span></p>
          <p className="lrn-session__sub">{tr(S.grading, lang)}</p>
          <Link href="/learn/path" className="col-btn col-btn--ghost col-btn--sm mt-3">{tr(S.review, lang)}</Link>
        </section>
        <section className="col-card" aria-labelledby="pf-add"><h2 id="pf-add" className="col-eyebrow" style={{ margin: 0 }}>{tr(rows.length < 5 ? S.add : S.full, lang)}</h2>{rows.length < 5 && <RowForm />}</section>
      </div>
      <h2 className="col-eyebrow mt-6 mb-3 flex items-center gap-2">{tr(S.yourRows, lang)} <span className="lrn-virtual">{tr(S.virtual, lang)}</span></h2>
      {rows.length === 0 && <p className="lrn-muted">{tr(S.none, lang)}</p>}
      <div className="lrn-list">
        {rows.map((r) => { const g = grades.find((x) => x.ref_id === r.id); return (
          <details key={r.id} className="col-card lrn-row">
            <summary className="flex items-center justify-between gap-2 flex-wrap" style={{ cursor: "pointer", minHeight: 44 }}>
              <span className="flex items-center gap-2"><IndianRupee size={16} aria-hidden /><strong className="lrn-num">{r.symbol}</strong><span className="lrn-virtual">{tr(S.virtual, lang)}</span></span>
              <span className="flex items-center gap-2 flex-wrap"><span className={`col-chip ${complete(r) ? "col-chip--up" : ""}`}>{tr(complete(r) ? S.complete : S.incomplete, lang)}</span>{g && <span className="col-chip">{tr(S.process, lang)} {g.process_grade}</span>}{g?.outcome_sign && <span className="col-chip">{tr(S.outcome, lang)} {g.outcome_sign}</span>}</span>
            </summary>
            {g?.feedback && <p className="lrn-notice mt-2">{tr(S.mentor, lang)}: {g.feedback}</p>}
            <RowForm row={r} /><DeleteButton id={r.id} />
          </details>); })}
      </div>
      <p className="lrn-muted mt-4" style={{ fontSize: "var(--col-text-dense)" }}>{TIER2}</p>
    </>
  );
}

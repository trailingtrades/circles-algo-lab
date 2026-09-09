"use client";
import { useState } from "react";
export interface BoardRow { rank: number; display_name: string | null; value: number; is_me: boolean; band: string }
const TABS = [["process", "Process Score", "Cumulative, out of 1000"], ["consistency", "Consistency", "Journal days + Friday review this week (resets weekly)"], ["improved", "Most Improved", "Process points earned in the last 14 days"]] as const;

export function BoardTabs({ process, consistency, improved, lang }: { process: BoardRow[]; consistency: BoardRow[]; improved: BoardRow[]; lang: "en" | "hi" }) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("process");
  const rows = tab === "process" ? process : tab === "consistency" ? consistency : improved;
  const me = rows.find((r) => r.is_me);
  const sub = TABS.find((t) => t[0] === tab)![2];
  return (
    <>
      <div className="col-tabs mt-4" role="tablist">{TABS.map(([k, l]) => <button key={k} type="button" role="tab" className="col-tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
      <p className="lrn-muted" style={{ fontSize: "var(--col-text-body-sm)" }}>{sub}</p>
      {me && <div className="col-card flex items-center justify-between gap-2 mb-3"><span>{lang === "hi" ? "Aapki position" : "Your position"}</span><span className="col-chip">{me.rank <= 10 ? `#${me.rank}` : me.band}</span></div>}
      <div className="lrn-table-wrap">
        <table className="col-table">
          <thead><tr><th>#</th><th className="col-text">Name</th><th>Points</th><th>Band</th></tr></thead>
          <tbody>
            {rows.filter((r) => r.rank <= 10 || r.is_me).map((r) => (
              <tr key={r.rank + (r.display_name ?? "me")} style={r.is_me ? { outline: "1px solid var(--col-brand)" } : undefined}>
                <td className="col-num">{r.rank}</td><td className="col-text">{r.display_name ?? (lang === "hi" ? "Aap" : "You")}{r.is_me && " (you)"}</td><td className="col-num">{r.value}</td><td className="col-text" style={{ textAlign: "center" }}>{r.band}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="col-text lrn-muted">Board abhi khali hai. Pehla quiz submit karte hi aap yahan dikhenge.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

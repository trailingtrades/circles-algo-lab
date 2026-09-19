"use client";
import { useState } from "react";
import { bandLabel } from "@/lib/scoring/rules";
import { t3, tr, type L, type Lang } from "@/lib/i18n/lang";

export interface BoardRow { rank: number; display_name: string | null; value: number; is_me: boolean; band: string }
type Tab = "process" | "consistency" | "improved";
/* Every board ranks process (score points, journal days, reviews). None of them can show money. */
const TABS: { k: Tab; label: L; sub: L }[] = [
  { k: "process", label: t3("Process Score", "Process Score", "प्रोसेस स्कोर"), sub: t3("Total so far, out of 1000.", "Ab tak ka total, 1000 mein se.", "अब तक का कुल, 1000 में से।") },
  { k: "consistency", label: t3("Consistency", "Consistency", "नियमितता"), sub: t3("One point for each day you wrote in your journal this week, two for the weekly review. Starts again every Monday.", "Is hafte jis din journal likha, uska 1 point; weekly review ke 2. Har Monday se phir shuru.", "इस हफ़्ते जिस दिन जर्नल लिखा, उसका 1 पॉइंट; हफ़्ते के रिव्यू के 2। हर सोमवार से फिर शुरू।") },
  { k: "improved", label: t3("Most improved", "Sabse zyada sudhaar", "सबसे ज़्यादा सुधार"), sub: t3("Process points earned in the last 14 days.", "Pichhle 14 din mein kamaaye process points.", "पिछले 14 दिन में मिले प्रोसेस पॉइंट।") },
];
const S = {
  you: t3("You", "Aap", "आप"), youTag: t3("(you)", "(aap)", "(आप)"), position: t3("Your position", "Aapki position", "आपकी पोज़िशन"),
  name: t3("Name", "Naam", "नाम"), points: t3("Points", "Points", "पॉइंट"), band: t3("Band", "Band", "बैंड"),
  empty: t3("No one is on this board yet. Submit your first session quiz and you will appear here.", "Board abhi khaali hai. Pehla session quiz submit karte hi aap yahan dikhenge.", "बोर्ड अभी खाली है। पहला सेशन क्विज़ सबमिट करते ही आप यहाँ दिखेंगे।"),
};

export function BoardTabs({ process, consistency, improved, lang }: { process: BoardRow[]; consistency: BoardRow[]; improved: BoardRow[]; lang: Lang }) {
  const [tab, setTab] = useState<Tab>("process");
  const rows = tab === "process" ? process : tab === "consistency" ? consistency : improved;
  const me = rows.find((r) => r.is_me);
  const cur = TABS.find((t) => t.k === tab)!;
  return (
    <>
      <div className="col-tabs mt-4" role="tablist">{TABS.map((t) => <button key={t.k} id={`bt-${t.k}`} type="button" role="tab" className="col-tab" aria-selected={tab === t.k} aria-controls="bt-panel" onClick={() => setTab(t.k)}>{tr(t.label, lang)}</button>)}</div>
      <div id="bt-panel" role="tabpanel" aria-labelledby={`bt-${tab}`}>
        <p className="lrn-muted" style={{ fontSize: "var(--col-text-body-sm)" }}>{tr(cur.sub, lang)}</p>
        {me && <div className="col-card flex items-center justify-between gap-2 mb-3"><span>{tr(S.position, lang)}</span><span className="col-chip">{me.rank <= 10 ? `#${me.rank}` : bandLabel(me.band, lang)}</span></div>}
        <div className="lrn-table-wrap">
          <table className="col-table">
            <thead><tr><th>#</th><th className="col-text">{tr(S.name, lang)}</th><th>{tr(S.points, lang)}</th><th>{tr(S.band, lang)}</th></tr></thead>
            <tbody>
              {rows.filter((r) => r.rank <= 10 || r.is_me).map((r) => (
                <tr key={r.rank + (r.display_name ?? "me")} style={r.is_me ? { outline: "1px solid var(--col-brand)" } : undefined}>
                  <td className="col-num">{r.rank}</td><td className="col-text">{r.display_name ?? tr(S.you, lang)}{r.is_me && r.display_name && ` ${tr(S.youTag, lang)}`}</td><td className="col-num">{r.value}</td><td className="col-text" style={{ textAlign: "center" }}>{bandLabel(r.band, lang)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={4} className="col-text lrn-muted">{tr(S.empty, lang)}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

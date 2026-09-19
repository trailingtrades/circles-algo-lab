"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { t3 } from "@/lib/i18n/lang";

const S = { loading: t3("Loading", "Load ho raha hai", "लोड हो रहा है") };

/* Client component so the screen-reader text follows the header language without waiting on the server. */
export default function Loading() {
  const { tx } = useLang();
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="lrn-skel" style={{ width: 160, height: 12 }} />
      <div className="lrn-skel" style={{ width: 280, maxWidth: "100%", height: 28, marginTop: 10 }} />
      <div className="lrn-grid mt-4">{[0, 1, 2].map((i) => <div key={i} className="col-card"><div className="lrn-skel" style={{ width: "40%", height: 10 }} /><div className="lrn-skel" style={{ width: "80%", height: 18, marginTop: 12 }} /><div className="lrn-skel" style={{ width: "60%", height: 12, marginTop: 8 }} /></div>)}</div>
      <span className="sr-only">{tx(S.loading)}</span>
    </div>
  );
}

export const dynamic = "force-dynamic";
import Link from "next/link";
import { loadScore } from "@/lib/scoring/read";
import { ScoreBreakdown } from "@/components/ui/ScoreBreakdown";
import { RankChip } from "@/components/ui/RankChip";
import { ArrowRight } from "@/components/ui/Icon";
import { TIER2 } from "@/lib/compliance/strings";
import { t3, tr } from "@/lib/i18n/lang";

const S = {
  eyebrow: t3("Process Score", "Process Score", "प्रोसेस स्कोर"),
  sample: t3("sample data", "sample data", "सैंपल डेटा"),
  lead: t3("This score measures your process, not your profit. Open any part to see which action earned each point.", "Ye score aapke process ka hai, profit ka nahi. Kisi bhi hisse ko kholkar dekhiye ki kaunsa point kis kaam se aaya.", "यह स्कोर आपके प्रोसेस का है, मुनाफ़े का नहीं। किसी भी हिस्से को खोलकर देखिए कि कौन-सा पॉइंट किस काम से मिला।"),
  next: t3("Next steps that add the most points", "Agle kaam jo sabse zyada points jodenge", "अगले काम जो सबसे ज़्यादा पॉइंट जोड़ेंगे"),
  allDone: t3("Nothing pending right now. Check the certificate page for what is left.", "Abhi kuch baaki nahi hai. Certificate page par dekhiye ki aur kya bacha hai.", "अभी कुछ बाकी नहीं है। सर्टिफ़िकेट पेज पर देखिए कि और क्या बचा है।"),
  cert: t3("Certificate", "Certificate", "सर्टिफ़िकेट"),
  points: t3("points", "points", "पॉइंट"),
};

export default async function ScorePage() {
  const s = await loadScore(); const L = (x: Parameters<typeof tr>[0]) => tr(x, s.lang);
  return (
    <>
      <p className="col-eyebrow">{s.levelTitle} · {L(S.eyebrow)}{s.demo && ` · ${L(S.sample)}`}</p>
      <div className="flex items-center gap-3 flex-wrap"><h1 className="lrn-title" style={{ margin: 0 }}><span className="lrn-num">{s.components.total}</span> <span className="lrn-muted" style={{ fontSize: 16 }}>/ 1000</span></h1><RankChip rank={s.rank} band={s.band} lang={s.lang} /></div>
      <p className="lrn-muted">{L(S.lead)}</p>
      <div className="lrn-grid mt-4">
        <section className="col-card" style={{ gridColumn: "1 / -1" }}><ScoreBreakdown components={s.components} events={s.events} lang={s.lang} /></section>
        <section className="col-card" aria-labelledby="nx">
          <h2 id="nx" className="lrn-session__title">{L(S.next)}</h2>
          <ul className="lrn-list mt-3">
            {s.actions.map((a) => <li key={a.href + a.label} className="col-card__inner lrn-res"><span>{L({ en: a.label, hi: a.labelHi, dv: a.labelDv })}</span><Link href={a.href} className="col-btn col-btn--ghost col-btn--sm" aria-label={`${L({ en: a.label, hi: a.labelHi, dv: a.labelDv })}, +${a.points} ${L(S.points)}`}><span className="lrn-num">+{a.points}</span> <ArrowRight size={14} aria-hidden /></Link></li>)}
            {s.actions.length === 0 && <li className="lrn-res">{L(S.allDone)} <Link href="/learn/certificate" className="lrn-link">{L(S.cert)}</Link></li>}
          </ul>
        </section>
      </div>
      <p className="lrn-muted mt-4" style={{ fontSize: "var(--col-text-dense)" }}>{TIER2}</p>
    </>
  );
}

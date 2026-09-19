export const dynamic = "force-dynamic";
import Link from "next/link";
import { getViewer, createClient } from "@/lib/supabase/server";
import { supabaseConfigured, siteUrl } from "@/lib/supabase/env";
import { loadLearnerState } from "@/lib/progress/load";
import { currentLevel } from "@/lib/progress/gating";
import { evaluate, type CriteriaInput } from "@/lib/cert/criteria";
import { gatherCriteria } from "@/lib/cert/issue";
import { shortKey } from "@/lib/cert/hash";
import { LEVELS, SESSIONS, EXAMS, WEEKS, pick3 } from "@/lib/content/course";
import { t3, tr } from "@/lib/i18n/lang";
import { RETAKE_CAP } from "@/lib/scoring/rules";
import { CertActions, type CertView } from "./CertActions";
import { CheckCircle, Circle, Shield } from "@/components/ui/Icon";
import { TIER1 } from "@/lib/compliance/strings";

const S = {
  eyebrow: t3("Certificate of Completion", "Certificate of Completion", "कोर्स पूरा करने का सर्टिफ़िकेट"),
  preview: t3("preview", "preview", "प्रीव्यू"),
  title: t3("Certificate", "Certificate", "सर्टिफ़िकेट"),
  intro: t3("Meet all six criteria below and the certificate is issued automatically. You don't need to request it.", "Neeche ke chhe criteria poore hote hi certificate apne aap issue ho jata hai. Alag se maangna nahi padta.", "नीचे की छह शर्तें पूरी होते ही सर्टिफ़िकेट अपने-आप जारी हो जाता है। अलग से माँगना नहीं पड़ता।"),
  allMet: t3("All criteria met", "Saare criteria poore", "सभी शर्तें पूरी"),
  met: (n: number) => t3(`${n} of 6 criteria met`, `6 mein se ${n} criteria poore`, `6 में से ${n} शर्तें पूरी`),
  open: t3("Open", "Kholiye", "खोलें"),
  done: t3("done", "ho gaya", "पूरा"),
  pending: t3("pending", "baaki", "बाकी"),
  about: t3("What this certificate is", "Ye certificate kya hai", "यह सर्टिफ़िकेट क्या है"),
  what: (lv: string, d: number, t: number, cap: number) => t3(`Certificate of Completion for ${lv} of the AI Trading Course. Result band: Pass, or Distinction for ${d}/${t} or more in the final exam (a retake counts for at most ${cap}%). You get an A4 PDF with a QR code that opens the public verify page.`, `AI Trading Course ke ${lv} ka Certificate of Completion. Result band: Pass, ya Distinction agar final exam mein ${d}/${t} ya usse zyada aaye (retake ke marks zyada se zyada ${cap}% tak gine jaate hain). A4 PDF milta hai, jis par QR code public verify page kholta hai.`, `AI ट्रेडिंग कोर्स के ${lv} का कोर्स पूरा करने का सर्टिफ़िकेट। नतीजा: पास, या डिस्टिंक्शन अगर फ़ाइनल परीक्षा में ${d}/${t} या उससे ज़्यादा अंक आएँ (दोबारा दी गई परीक्षा के अंक ज़्यादा से ज़्यादा ${cap}% तक गिने जाते हैं)। A4 PDF मिलती है, जिस पर QR कोड पब्लिक वेरिफ़ाई पेज खोलता है।`),
  notSebi: t3("This certifies course completion only. It is not a SEBI or NISM certification and confers no licence to advise.", "Ye certificate sirf course poora karne ka hai. Ye SEBI ya NISM certification nahi hai, aur isse investment advice dene ka koi licence nahi milta.", "यह सर्टिफ़िकेट सिर्फ़ कोर्स पूरा करने का है। यह SEBI या NISM सर्टिफ़िकेशन नहीं है, और इससे निवेश सलाह देने का कोई लाइसेंस नहीं मिलता।"),
};

/** Live criteria checklist, then download + share once earned (§7, §11). */
export default async function CertificatePage() {
  const { state, demo, lang } = await loadLearnerState();
  const level = currentLevel(state);
  const lv = LEVELS.find((l) => l.slug === level)!;
  const final = EXAMS.find((e) => e.level === level && e.week === null);
  let facts: CriteriaInput = { sessionsTotal: SESSIONS.filter((s) => s.level === level).length, sessionsComplete: 2, finalPct: null, weeklyAttempted: 0, weeklyTotal: EXAMS.filter((e) => e.level === level && e.week !== null).length, artefactsGraded: [], artefactsRequired: 5, fridayReviews: 0, fridayTotal: WEEKS.filter((w) => w.level === level).length, suspended: false, level };
  let certs: CertView[] = [];
  if (!demo && supabaseConfigured()) {
    const v = await getViewer();
    if (v) {
      facts = await gatherCriteria(v.id, level);
      const sb = await createClient();
      const { data } = await sb.from("certificates").select("id,cert_no,issued_on,band,status,verify_hash,pdf_storage_path,levels(slug)").eq("user_id", v.id).order("issued_on", { ascending: false });
      certs = (data ?? []).map((c) => {
        // Titles come from the content files (all three languages), so the page does not depend on the *_dv DB columns.
        const l = LEVELS.find((x) => x.slug === (c.levels as unknown as { slug: string } | null)?.slug);
        // The shared link carries ?k= (the QR short key) so a copied link is as tamper-evident as the QR code.
        const path = `/verify/${c.cert_no}?k=${shortKey(String(c.verify_hash ?? ""))}`;
        return { id: c.id, cert_no: c.cert_no, issued_on: c.issued_on, band: c.band, status: c.status, level: l ? pick3(l, "title", lang) : "", levelSlug: l?.slug ?? "", pdf: !!c.pdf_storage_path, verifyPath: path, verifyUrl: `${siteUrl()}${path}` };
      });
    }
  }
  const ev = evaluate(facts);
  const lvTitle = pick3(lv, "title", lang);
  return (
    <>
      <p className="col-eyebrow">{lvTitle} · {tr(S.eyebrow, lang)}{demo && ` · ${tr(S.preview, lang)}`}</p>
      <h1 className="lrn-title">{tr(S.title, lang)}</h1>
      <p className="lrn-muted" style={{ marginTop: 0 }}>{tr(S.intro, lang)}</p>
      <div className="lrn-grid mt-4">
        <section className="col-card" aria-labelledby="crit" style={{ gridColumn: "1 / -1" }}>
          <h2 id="crit" className="lrn-session__title">{tr(ev.ok ? S.allMet : S.met(ev.items.filter((x) => x.ok).length), lang)}</h2>
          <ul className="lrn-checks mt-3">
            {ev.items.map((c) => <li key={c.key}>{c.ok ? <CheckCircle size={18} aria-label={tr(S.done, lang)} style={{ color: "var(--col-up-dark)" }} /> : <Circle size={18} aria-label={tr(S.pending, lang)} />}<span style={{ flex: 1 }}>{tr(c.text, lang)} <span className="lrn-muted lrn-num">({tr(c.detail, lang)})</span></span>{!c.ok && <Link href={c.href} className="lrn-link" style={{ fontSize: "var(--col-text-body-sm)" }}>{tr(S.open, lang)}</Link>}</li>)}
          </ul>
          <CertActions level={level} demo={demo} allOk={ev.ok} certs={certs} />
        </section>
        <section className="col-card" aria-labelledby="about">
          <Shield size={28} strokeWidth={1.5} aria-hidden style={{ color: "var(--col-brand)" }} />
          <h2 id="about" className="lrn-session__title mt-2">{tr(S.about, lang)}</h2>
          <p className="lrn-session__sub mt-2">{tr(S.what(lvTitle, final?.distinction_marks ?? 30, final?.total_marks ?? 36, Math.round(RETAKE_CAP * 100)), lang)}</p>
          <p className="lrn-session__sub mt-2"><strong>{tr(S.notSebi, lang)}</strong></p>
        </section>
      </div>
      <p className="lrn-muted mt-4" style={{ fontSize: "var(--col-text-dense)" }}>{TIER1}</p>
    </>
  );
}

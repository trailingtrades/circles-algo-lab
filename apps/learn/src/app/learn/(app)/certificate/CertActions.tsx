"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { checkNow, downloadUrl } from "./actions";
import type { LevelSlug } from "@/lib/content/course";
import { useLang } from "@/lib/i18n/LangProvider";
import { t3, type L } from "@/lib/i18n/lang";
import { Download, Share, RefreshCw, CheckCircle, XCircle, Copy } from "@/components/ui/Icon";

const S = {
  issue: t3("Issue my certificate", "Mera certificate issue kijiye", "मेरा सर्टिफ़िकेट जारी करें"),
  check: t3("Check again", "Dobara check kijiye", "फिर से जाँचें"),
  issued: t3("Your certificate has been issued. Congratulations.", "Aapka certificate issue ho gaya. Bahut badhai.", "आपका सर्टिफ़िकेट जारी हो गया। बहुत बधाई।"),
  notYet: t3("Not every criterion is met yet. The checklist above shows what is left.", "Abhi saare criteria poore nahi hue. Upar ki checklist mein dekhiye kya baaki hai.", "अभी सभी शर्तें पूरी नहीं हुईं। ऊपर की चेकलिस्ट में देखिए क्या बाकी है।"),
  revoked: t3("This certificate was revoked. For questions, write to the Compliance Officer at info@5circles.co.", "Ye certificate revoke kiya gaya hai. Koi sawaal ho to Compliance Officer ko info@5circles.co par likhiye.", "यह सर्टिफ़िकेट रद्द किया गया है। कोई सवाल हो तो कंप्लायंस ऑफ़िसर को info@5circles.co पर लिखिए।"),
  unavailable: t3("Could not check right now. Please try again in a minute.", "Abhi check nahi ho paya. Ek minute baad dobara try kijiye.", "अभी जाँच नहीं हो पाई। एक मिनट बाद फिर से कोशिश करें।"),
  download: t3("Download PDF", "PDF download kijiye", "PDF डाउनलोड करें"),
  pdfPending: t3("The PDF is still being prepared. Please try again in a few minutes.", "PDF abhi tayyar ho raha hai. Kuch minute baad dobara try kijiye.", "PDF अभी तैयार हो रही है। कुछ मिनट बाद फिर से कोशिश करें।"),
  pdfFail: t3("Could not open the PDF right now. Please try again in a minute.", "Abhi PDF nahi khul paya. Ek minute baad dobara try kijiye.", "अभी PDF नहीं खुल पाई। एक मिनट बाद फिर से कोशिश करें।"),
  verifyPage: t3("Verify page", "Verify page", "वेरिफ़ाई पेज"),
  copy: t3("Copy verify link", "Verify link copy kijiye", "वेरिफ़ाई लिंक कॉपी करें"),
  copied: t3("Verify link copied.", "Verify link copy ho gaya.", "वेरिफ़ाई लिंक कॉपी हो गया।"),
  pass: t3("Pass", "Pass", "पास"),
  distinction: t3("Distinction", "Distinction", "डिस्टिंक्शन"),
  statusIssued: t3("Issued", "Issued", "जारी"),
  statusRevoked: t3("Revoked", "Revoked", "रद्द"),
};

/** verifyPath is basePath-relative (next/link adds /smart); verifyUrl is the absolute link to share (siteUrl() + ?k=). */
export type CertView = { id: string; cert_no: string; issued_on: string; band: string; status: string; level: string; levelSlug: string; pdf: boolean; verifyPath: string; verifyUrl: string };

export function CertActions({ level, demo, allOk, certs }: { level: LevelSlug; demo: boolean; allOk: boolean; certs: CertView[] }) {
  const { tx } = useLang();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ at: string; text: L | string } | null>(null);
  // The re-check belongs to the level on screen: a Tier 1 certificate must not hide the Tier 2 button.
  const hasRow = certs.some((c) => c.levelSlug === level);
  const note = (at: string) => msg?.at === at && <p className="lrn-notice mt-2" role="status">{tx(msg.text)}</p>;
  return (
    <div className="mt-4">
      {!hasRow && (
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" className="col-btn col-btn--primary" disabled={demo || pending} onClick={() => start(async () => { const r = await checkNow(level); setMsg({ at: "check", text: S[r.state === "issued" ? "issued" : r.state === "revoked" ? "revoked" : r.state === "not_yet" ? "notYet" : "unavailable"] }); })}><RefreshCw size={16} aria-hidden /> {tx(allOk ? S.issue : S.check)}</button>
        </div>
      )}
      {note("check")}
      {certs.map((c) => {
        const revoked = c.status === "revoked";
        return (
          <div key={c.id} className="col-card__inner lrn-bar mt-3" aria-live="polite">
            <div className="flex items-center gap-2 flex-wrap">
              {revoked ? <XCircle size={18} aria-hidden style={{ color: "var(--col-down-dark)" }} /> : <CheckCircle size={18} aria-hidden style={{ color: "var(--col-up-dark)" }} />}
              <strong>{c.level}</strong><span className="col-chip lrn-num">{c.cert_no}</span>
              {!revoked && <span className="col-chip">{tx(c.band === "distinction" ? S.distinction : S.pass)}</span>}
              <span className={`col-chip ${revoked ? "lrn-status--suspended" : ""}`}>{tx(revoked ? S.statusRevoked : S.statusIssued)}</span>
              <span className="lrn-muted lrn-num">{c.issued_on}</span>
            </div>
            {revoked ? <p className="lrn-session__sub mt-2">{tx(S.revoked)}</p> : (
              <div className="lrn-actions mt-3">
                <button type="button" className="col-btn col-btn--primary col-btn--sm" disabled={!c.pdf || pending} onClick={() => start(async () => { const u = await downloadUrl(c.id); if (u) window.open(u, "_blank", "noopener"); else setMsg({ at: c.id, text: S.pdfFail }); })}><Download size={14} aria-hidden /> {tx(S.download)}</button>
                <Link className="col-btn col-btn--ghost col-btn--sm" href={c.verifyPath} target="_blank" rel="noopener noreferrer"><Share size={14} aria-hidden /> {tx(S.verifyPage)}</Link>
                <button type="button" className="col-btn col-btn--ghost col-btn--sm" onClick={async () => { try { await navigator.clipboard.writeText(c.verifyUrl); setMsg({ at: c.id, text: S.copied }); } catch { setMsg({ at: c.id, text: c.verifyUrl }); } }}><Copy size={14} aria-hidden /> {tx(S.copy)}</button>
              </div>
            )}
            {!c.pdf && !revoked && <p className="lrn-session__sub mt-2">{tx(S.pdfPending)}</p>}
            {note(c.id)}
          </div>
        );
      })}
    </div>
  );
}

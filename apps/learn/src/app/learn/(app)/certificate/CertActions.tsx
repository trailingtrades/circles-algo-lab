"use client";
import { useState, useTransition } from "react";
import { checkNow, downloadUrl } from "./actions";
import type { LevelSlug } from "@/lib/content/course";
import { Download, Share, RefreshCw, CheckCircle, Copy } from "@/components/ui/Icon";

export function CertActions({ level, demo, allOk, certs }: { level: LevelSlug; demo: boolean; allOk: boolean; certs: { id: string; cert_no: string; issued_on: string; band: string; status: string; level: string; pdf: boolean }[] }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const site = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <div className="mt-4">
      {certs.length === 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" className="col-btn col-btn--primary" disabled={demo || pending} onClick={() => start(async () => { const r = await checkNow(level); setMsg(r.issued ? "Certificate issued. Badhai ho!" : "Abhi criteria poore nahi hue. Checklist dekhiye."); })}><RefreshCw size={16} aria-hidden /> {allOk ? "Issue my certificate" : "Check again"}</button>
          {msg && <span className="lrn-notice" role="status">{msg}</span>}
        </div>
      )}
      {certs.map((c) => (
        <div key={c.id} className="col-card__inner lrn-bar mt-3" aria-live="polite">
          <div className="flex items-center gap-2 flex-wrap"><CheckCircle size={18} aria-hidden style={{ color: "var(--col-up-dark)" }} /><strong>{c.level}</strong><span className="col-chip lrn-num">{c.cert_no}</span><span className="col-chip">{c.band === "distinction" ? "Distinction" : "Pass"}</span><span className={`col-chip ${c.status === "revoked" ? "lrn-status--suspended" : ""}`}>{c.status}</span><span className="lrn-muted lrn-num">{c.issued_on}</span></div>
          <div className="lrn-actions mt-3">
            <button type="button" className="col-btn col-btn--primary col-btn--sm" disabled={!c.pdf || pending} onClick={() => start(async () => { const u = await downloadUrl(c.id); if (u) window.open(u, "_blank", "noopener"); else setMsg("PDF abhi tayyar nahi. Thodi der mein try kijiye."); })}><Download size={14} aria-hidden /> Download PDF</button>
            <a className="col-btn col-btn--ghost col-btn--sm" href={`/verify/${c.cert_no}`} target="_blank" rel="noopener noreferrer"><Share size={14} aria-hidden /> Verify page</a>
            <button type="button" className="col-btn col-btn--ghost col-btn--sm" onClick={async () => { try { await navigator.clipboard.writeText(`${site}/verify/${c.cert_no}`); setMsg("Verify link copied."); } catch { setMsg(`${site}/verify/${c.cert_no}`); } }}><Copy size={14} aria-hidden /> Copy verify link</button>
          </div>
          {msg && <p className="lrn-notice mt-2" role="status">{msg}</p>}
        </div>
      ))}
    </div>
  );
}

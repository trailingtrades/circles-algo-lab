export const dynamic = "force-dynamic";
import Link from "next/link";
import { getViewer, createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { loadLearnerState } from "@/lib/progress/load";
import { nextSession } from "@/lib/progress/gating";
import { evaluate } from "@/lib/cert/criteria";
import { gatherCriteria } from "@/lib/cert/issue";
import { LEVELS, type LevelSlug } from "@/lib/content/course";
import { CertActions } from "./CertActions";
import { CheckCircle, Circle, Shield } from "@/components/ui/Icon";
import { TIER1, CREDENTIAL_LINE } from "@/lib/compliance/strings";

/** Live criteria checklist, then download + share once earned (§7, §11). */
export default async function CertificatePage() {
  const { state, demo, lang } = await loadLearnerState();
  const level: LevelSlug = nextSession(state)?.level ?? "advanced";
  const lv = LEVELS.find((l) => l.slug === level)!;
  let facts = { sessionsTotal: 20, sessionsComplete: 2, finalPct: null as number | null, weeklyAttempted: 0, weeklyTotal: 3, artefactsGraded: [] as { grade: string }[], artefactsRequired: 5, fridayReviews: 0, suspended: false };
  let certs: { id: string; cert_no: string; issued_on: string; band: string; status: string; level: string; pdf: boolean }[] = [];
  if (!demo && supabaseConfigured()) {
    const v = await getViewer();
    if (v) {
      facts = await gatherCriteria(v.id, level);
      const sb = await createClient();
      const { data } = await sb.from("certificates").select("id,cert_no,issued_on,band,status,pdf_storage_path,levels(title_en)").eq("user_id", v.id).order("issued_on", { ascending: false });
      certs = (data ?? []).map((c) => ({ id: c.id, cert_no: c.cert_no, issued_on: c.issued_on, band: c.band, status: c.status, level: (c.levels as unknown as { title_en: string } | null)?.title_en ?? "", pdf: !!c.pdf_storage_path }));
    }
  }
  const ev = evaluate(facts);
  return (
    <>
      <p className="col-eyebrow">{lv.title_en} · Certificate of Completion{demo && " · preview"}</p>
      <h1 className="lrn-title">Certificate</h1>
      <p className="lrn-muted" style={{ marginTop: 0 }}>{lang === "hi" ? "Chhe criteria, sab poore hone par certificate apne aap issue hota hai. Kisi ko manually maangna nahi padta." : "Six criteria; the certificate issues automatically the moment the last one is true."}</p>
      <div className="lrn-grid mt-4">
        <section className="col-card" aria-labelledby="crit" style={{ gridColumn: "1 / -1" }}>
          <h2 id="crit" className="lrn-session__title">{ev.ok ? (lang === "hi" ? "Sab criteria poore" : "All criteria met") : `${ev.items.filter((x) => x.ok).length} / 6 criteria met`}</h2>
          <ul className="lrn-checks mt-3">
            {ev.items.map((c) => <li key={c.key}>{c.ok ? <CheckCircle size={18} aria-label="done" style={{ color: "var(--col-up-dark)" }} /> : <Circle size={18} aria-label="pending" />}<span style={{ flex: 1 }}>{lang === "hi" ? c.labelHi : c.label} <span className="lrn-muted lrn-num">({c.detail})</span></span>{!c.ok && <Link href={c.href} className="lrn-link" style={{ fontSize: "var(--col-text-body-sm)" }}>{lang === "hi" ? "Jao" : "Go"}</Link>}</li>)}
          </ul>
          <CertActions level={level} demo={demo} allOk={ev.ok} certs={certs} />
        </section>
        <section className="col-card" aria-label="What the certificate is">
          <Shield size={28} strokeWidth={1.5} aria-hidden style={{ color: "var(--col-brand)" }} />
          <p className="lrn-session__sub mt-2">Certificate of Completion — AI Trading Course, {lv.title_en}. Result band Pass or Distinction (final exam 30/36 or more). A4 landscape PDF with a QR code to the public verify page.</p>
          <p className="lrn-session__sub"><strong>This certifies course completion only. It is not a SEBI or NISM certification and confers no licence to advise.</strong></p>
        </section>
      </div>
      <p className="lrn-footer__cred mt-4" style={{ fontSize: "var(--col-text-dense)" }}>{CREDENTIAL_LINE}</p>
      <p className="lrn-muted" style={{ fontSize: "var(--col-text-dense)" }}>{TIER1}</p>
    </>
  );
}

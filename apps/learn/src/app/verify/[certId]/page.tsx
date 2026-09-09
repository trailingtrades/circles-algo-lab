export const dynamic = "force-dynamic";
import Image from "next/image";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/supabase/env";
import { isCertNo } from "@/lib/cert/number";
import { verifyHash, hashesMatch, shortKey } from "@/lib/cert/hash";
import { ComplianceFooter } from "@/components/ui/ComplianceFooter";
import { CREDENTIAL_LINE, COMPANY } from "@/lib/compliance/strings";
import { ShieldCheck, XCircle, Search, AlertCircle } from "@/components/ui/Icon";

type Result = { kind: "valid" | "revoked"; cert_no: string; name: string; level: string; issued_on: string; revoked_at?: string | null } | { kind: "not_found" } | { kind: "rate_limited" } | { kind: "bad_link" } | { kind: "unconfigured" };

/** Public verification (§11): no login; cert number + learner name + level + issue date + status only. No email, phone, cohort, score or rank. */
async function lookup(raw: string, k: string | null): Promise<Result> {
  if (!supabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.CERT_SIGNING_SECRET) return { kind: "unconfigured" };
  const certNo = raw.trim().toUpperCase();
  if (!isCertNo(certNo)) return { kind: "not_found" };
  const admin = createAdminClient();
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  const { data: okRate } = await admin.rpc("verify_rate_ok", { p_ip_hash: createHash("sha256").update(ip).digest("hex"), p_limit: 30 });
  if (okRate === false) return { kind: "rate_limited" };
  const { data: c } = await admin.from("certificates").select("cert_no,user_id,level_id,issued_on,verify_hash,status,revoked_at,profiles(full_name),levels(title_en)").eq("cert_no", certNo).maybeSingle();
  if (!c) return { kind: "not_found" };
  // A forged or tampered row cannot reproduce the HMAC; a forged QR link cannot match ?k.
  const expected = verifyHash(c.cert_no, c.user_id, c.level_id, c.issued_on);
  if (!hashesMatch(expected, c.verify_hash)) return { kind: "not_found" };
  if (k !== null && k !== shortKey(expected)) return { kind: "bad_link" };
  const name = (c.profiles as unknown as { full_name: string } | null)?.full_name ?? "";
  const level = (c.levels as unknown as { title_en: string } | null)?.title_en ?? "";
  return { kind: c.status === "revoked" ? "revoked" : "valid", cert_no: c.cert_no, name, level, issued_on: c.issued_on, revoked_at: c.revoked_at };
}

export default async function VerifyPage({ params, searchParams }: { params: Promise<{ certId: string }>; searchParams: Promise<{ k?: string; q?: string }> }) {
  const { certId } = await params; const sp = await searchParams;
  const target = sp.q ? sp.q : certId;
  const r = target === "lookup" && !sp.q ? null : await lookup(target, sp.k ?? null);
  return (
    <div className="lrn-shell">
      <main className="lrn-main" style={{ maxWidth: 760, margin: "0 auto", width: "100%" }}>
        <div className="flex items-center gap-3 mb-4"><Image src="/brand/logo.png" alt="5 Circles" width={40} height={40} /><div><div style={{ fontWeight: 700 }}>5C Learn · Certificate verification</div><div className="col-eyebrow">{COMPANY.short} · {COMPANY.tagline}</div></div></div>
        <form method="get" action="/verify/lookup" className="col-card flex gap-2 items-end flex-wrap" role="search">
          <div className="lrn-field" style={{ flex: "1 1 240px", margin: 0 }}><label htmlFor="q">Certificate number</label><input id="q" name="q" className="col-input lrn-num" placeholder="5C-FOUND-2026-XXXXXX" defaultValue={sp.q ?? (certId !== "lookup" ? certId : "")} required /></div>
          <button className="col-btn col-btn--primary"><Search size={16} aria-hidden /> Verify</button>
        </form>
        {r && (
          <section className="col-card mt-4" aria-live="polite">
            {r.kind === "valid" && <><p className="flex items-center gap-2" style={{ color: "var(--col-up-dark)", fontWeight: 700, margin: 0 }}><ShieldCheck size={22} aria-hidden /> Valid certificate</p><Detail r={r} /></>}
            {r.kind === "revoked" && <><p className="flex items-center gap-2" style={{ color: "var(--col-down-dark)", fontWeight: 700, margin: 0 }}><XCircle size={22} aria-hidden /> Revoked{r.revoked_at ? ` on ${new Date(r.revoked_at).toLocaleDateString("en-IN")}` : ""}</p><Detail r={r} /></>}
            {r.kind === "not_found" && <p className="flex items-center gap-2" style={{ margin: 0 }}><XCircle size={20} aria-hidden /> No certificate with that number was issued by 5 Circles Pvt Ltd.</p>}
            {r.kind === "bad_link" && <p className="flex items-center gap-2" style={{ margin: 0 }}><AlertCircle size={20} aria-hidden /> This link does not match the certificate record. Type the number above to verify it directly.</p>}
            {r.kind === "rate_limited" && <p style={{ margin: 0 }}>Too many lookups from this network. Please try again in a minute.</p>}
            {r.kind === "unconfigured" && <p style={{ margin: 0 }}>Verification service is not configured on this deployment.</p>}
          </section>
        )}
        <section className="col-card mt-4" aria-label="Issuing entity">
          <span className="col-eyebrow">Issuing entity</span>
          <p style={{ margin: "6px 0 0" }}><strong>{COMPANY.legal}</strong> · {COMPANY.regType} · SEBI registration granted {COMPANY.regGranted}</p>
          <p className="lrn-muted" style={{ margin: "4px 0 0", fontSize: "var(--col-text-body-sm)" }}>Principal Officer: {COMPANY.principalOfficer} · Compliance Officer: {COMPANY.complianceOfficer} · {COMPANY.email} · {COMPANY.phone} · {COMPANY.site}</p>
          <p className="lrn-muted" style={{ margin: "4px 0 0", fontSize: "var(--col-text-body-sm)" }}>Grievances: write to the Compliance Officer; unresolved matters may be escalated to SEBI SCORES (scores.sebi.gov.in) or the Online Dispute Resolution portal (smartodr.in).</p>
          <p className="lrn-footer__cred mt-2" style={{ fontSize: "var(--col-text-dense)" }}>{CREDENTIAL_LINE}</p>
          <p style={{ margin: "6px 0 0", fontSize: "var(--col-text-body-sm)" }}><strong>A 5C Learn certificate certifies course completion only. It is not a SEBI or NISM certification and confers no licence to advise.</strong></p>
        </section>
      </main>
      <ComplianceFooter tier={1} grievance />
    </div>
  );
}
function Detail({ r }: { r: { cert_no: string; name: string; level: string; issued_on: string } }) {
  return <dl className="lrn-dl"><dt>Certificate No.</dt><dd className="lrn-num">{r.cert_no}</dd><dt>Learner</dt><dd>{r.name}</dd><dt>Level</dt><dd>Certificate of Completion — AI Trading Course, {r.level}</dd><dt>Issued on</dt><dd className="lrn-num">{r.issued_on}</dd></dl>;
}

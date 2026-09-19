export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/supabase/env";
import { isCertNo } from "@/lib/cert/number";
import { verifyHash, hashesMatch, shortKey } from "@/lib/cert/hash";
import { COMPANY, SEBI_REG_NO } from "@/lib/compliance/strings";
import { ShieldCheck, XCircle, Search, AlertCircle } from "@/components/ui/Icon";
import { AuthLinks } from "@/app/learn/AuthLinks";
import { ComplianceFooter } from "@/components/ui/ComplianceFooter";

// A verify URL names a learner: keep these pages out of search results.
export const metadata: Metadata = { title: "Certificate verification · 5 Circles Academy", robots: { index: false, follow: false } };

type Found = { cert_no: string; name: string; level: string; issued_on: string; revoked_at?: string | null };
type Result = ({ kind: "valid" | "revoked" } & Found) | { kind: "not_found" } | { kind: "bad_format" } | { kind: "rate_limited" } | { kind: "bad_link" } | { kind: "unconfigured" };
type Row = { cert_no: string; user_id: string; level_id: string; issued_on: string; verify_hash: string; status: string; revoked_at: string | null; learner_name?: string | null; profiles: { full_name: string } | null; levels: { title_en: string } | null };
const COLS = "cert_no,user_id,level_id,issued_on,verify_hash,status,revoked_at,profiles(full_name),levels(title_en)";
const NOT_SEBI = "A Circle S.M.A.R.T certificate certifies course completion only. It is not a SEBI or NISM certification and confers no licence to advise.";
/** searchParams values arrive as string[] when a key repeats (?q=a&q=b): take the first, never crash. */
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Public verification (§11): no login; cert number + learner name + level + issue date + status only. No email, phone, cohort, score or rank. */
async function lookup(raw: string, k: string | null): Promise<Result> {
  if (!supabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.CERT_SIGNING_SECRET) return { kind: "unconfigured" };
  const certNo = raw.trim().toUpperCase();
  if (!isCertNo(certNo)) return { kind: "bad_format" };
  const admin = createAdminClient();
  const h = await headers();
  // nginx sets X-Real-IP to the connecting address. The FIRST X-Forwarded-For entry is whatever the client typed,
  // so it is never the key; if X-Real-IP is absent, use the LAST hop (the one nginx appended itself).
  const ip = h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",").pop()?.trim() || "unknown";
  const { data: okRate } = await admin.rpc("verify_rate_ok", { p_ip_hash: createHash("sha256").update(ip).digest("hex"), p_limit: 30 });
  if (okRate === false) return { kind: "rate_limited" };
  const read = async (cols: string) => (await admin.from("certificates").select(cols).eq("cert_no", certNo).limit(1)) as unknown as { data: Row[] | null; error: { message: string } | null };
  // learner_name arrives with migration 0010; until then read the row without it (and fall back to the profile name).
  let q = await read(`${COLS},learner_name`);
  if (q.error) q = await read(COLS);
  const c = q.data?.[0];
  if (!c) return { kind: "not_found" };
  // A forged or tampered row cannot reproduce the HMAC; a forged QR link cannot match ?k.
  const expected = verifyHash(c.cert_no, c.user_id, c.level_id, c.issued_on);
  if (!hashesMatch(expected, c.verify_hash)) return { kind: "not_found" };
  if (k !== null && k !== shortKey(expected)) return { kind: "bad_link" };
  // The name frozen at issue, not the learner's current (self-editable) profile name.
  const name = c.learner_name?.trim() || c.profiles?.full_name || "";
  return { kind: c.status === "revoked" ? "revoked" : "valid", cert_no: c.cert_no, name, level: c.levels?.title_en ?? "", issued_on: c.issued_on, revoked_at: c.revoked_at };
}

export default async function VerifyPage({ params, searchParams }: { params: Promise<{ certId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { certId } = await params; const sp = await searchParams;
  const q = one(sp.q).trim(), k = one(sp.k) || null;
  const target = q || certId;
  const r = target === "lookup" ? null : await lookup(target, q ? null : k);
  // A public credential page read by third-party verifiers: one language (English) throughout, whatever
  // language cookie the browser carries. lang="en" also overrides <html lang>, which follows that cookie.
  return (
    <div className="lrn-shell" lang="en">
      <main className="lrn-main" style={{ maxWidth: 760, margin: "0 auto", width: "100%" }}>
        <div className="flex items-center gap-3 mb-4"><Image src={BASE + "/brand/logo.png"} alt="5 Circles" width={40} height={40} /><div><div style={{ fontWeight: 700 }}>Circle S.M.A.R.T · Certificate verification</div><div className="col-eyebrow">{COMPANY.short} · {COMPANY.tagline}</div></div></div>
        {/* A plain GET form does not get the basePath added, so it is prefixed here. */}
        <form method="get" action={`${BASE}/verify/lookup`} className="col-card flex gap-2 items-end flex-wrap" role="search">
          <div className="lrn-field" style={{ flex: "1 1 240px", margin: 0 }}><label htmlFor="q">Certificate number</label><input id="q" name="q" className="col-input lrn-num" placeholder="5C-FOUND-2026-XXXXXX" defaultValue={q || (certId !== "lookup" ? certId : "")} maxLength={40} autoComplete="off" required /></div>
          <button className="col-btn col-btn--primary"><Search size={16} aria-hidden /> Verify</button>
        </form>
        {r && (
          <section className="col-card mt-4" aria-live="polite">
            {r.kind === "valid" && <><p className="flex items-center gap-2" style={{ color: "var(--col-up-dark)", fontWeight: 700, margin: 0 }}><ShieldCheck size={22} aria-hidden /> Valid certificate</p><Detail r={r} /></>}
            {r.kind === "revoked" && <><p className="flex items-center gap-2" style={{ color: "var(--col-down-dark)", fontWeight: 700, margin: 0 }}><XCircle size={22} aria-hidden /> Revoked{r.revoked_at ? ` on ${new Date(r.revoked_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" })}` : ""}. This certificate is no longer valid.</p><Detail r={r} /></>}
            {r.kind === "not_found" && <p className="flex items-center gap-2" style={{ margin: 0 }}><XCircle size={20} aria-hidden /> No certificate with that number was issued by {COMPANY.short}.</p>}
            {r.kind === "bad_format" && <p className="flex items-center gap-2" style={{ margin: 0 }}><AlertCircle size={20} aria-hidden /> That is not a valid certificate number. Numbers look like 5C-FOUND-2026-XXXXXX.</p>}
            {r.kind === "bad_link" && <p className="flex items-center gap-2" style={{ margin: 0 }}><AlertCircle size={20} aria-hidden /> This link does not match the certificate record. Type the number above to verify it directly.</p>}
            {r.kind === "rate_limited" && <p style={{ margin: 0 }}>Too many lookups from this network. Please try again in a minute.</p>}
            {r.kind === "unconfigured" && <p style={{ margin: 0 }}>Verification is temporarily unavailable. Please try again later or write to {COMPANY.email}.</p>}
          </section>
        )}
        {/* The bare lookup page and every "no" answer need a way on: sign-in, the Academy, or a person on WhatsApp.
            A found certificate keeps just the learner sign-in (the footer carries the Academy and policy links). */}
        {r?.kind === "valid" || r?.kind === "revoked"
          ? <nav aria-label="Learner" className="flex justify-center mt-4" style={{ fontSize: "var(--col-text-body-sm)" }}><Link className="lrn-link" href="/learn">Learner sign in</Link></nav>
          : <AuthLinks lang="en" />}
        <section className="col-card mt-4" aria-labelledby="issuer">
          <h2 id="issuer" className="col-eyebrow" style={{ margin: 0 }}>Issuing entity</h2>
          <p style={{ margin: "6px 0 0" }}><strong>{COMPANY.legal}</strong> · SEBI Registered Research Analyst (Non-Individual) · Reg. No. {SEBI_REG_NO} · registered {COMPANY.regGranted}</p>
          <p className="lrn-muted" style={{ margin: "4px 0 0", fontSize: "var(--col-text-body-sm)" }}>Principal Officer: {COMPANY.principalOfficer} · Compliance Officer: {COMPANY.complianceOfficer} · <a className="lrn-link" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> · <a className="lrn-link" href="tel:+916387497277">{COMPANY.phone}</a></p>
          <p className="lrn-muted" style={{ margin: "4px 0 0", fontSize: "var(--col-text-body-sm)" }}>Grievances: write to the Compliance Officer. Unresolved matters may be escalated to <a className="lrn-link" href="https://scores.sebi.gov.in/" target="_blank" rel="noopener noreferrer">SEBI SCORES</a> or <a className="lrn-link" href="https://smartodr.in/login" target="_blank" rel="noopener noreferrer">SMART ODR</a>.</p>
          <p style={{ margin: "8px 0 0", fontWeight: 600 }}>{NOT_SEBI}</p>
        </section>
      </main>
      {/* The site-wide company footer: credential line, offices, investor protection, policies, Tier-1 disclaimer. */}
      <ComplianceFooter tier={1} lang="en" />
    </div>
  );
}
function Detail({ r }: { r: Found }) {
  return <dl className="lrn-dl"><dt>Certificate No.</dt><dd className="lrn-num">{r.cert_no}</dd><dt>Learner</dt><dd>{r.name}</dd><dt>Level</dt><dd>Certificate of Completion, AI Trading Course, {r.level}</dd><dt>Issued on</dt><dd className="lrn-num">{r.issued_on}</dd></dl>;
}

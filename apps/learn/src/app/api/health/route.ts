import { NextResponse } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY, siteUrl } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

/** Deployment health: are the public Supabase settings present and accepted by the project? Never returns key material. */
export async function GET() {
  const url = SUPABASE_URL.trim();
  const key = SUPABASE_ANON_KEY.trim();
  let auth: string = "not_checked";
  if (url && key) {
    try {
      const r = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/settings`, { headers: { apikey: key }, cache: "no-store" });
      auth = r.ok ? "ok" : `http_${r.status}`;
    } catch (e) {
      auth = `unreachable:${(e as Error).message.slice(0, 60)}`;
    }
  }
  return NextResponse.json({
    ok: auth === "ok",
    supabase_url_host: url ? (() => { try { return new URL(url).host; } catch { return "invalid_url"; } })() : "missing",
    anon_key: key ? `${key.length} chars, ${key.startsWith("eyJ") ? "jwt" : key.startsWith("sb_publishable_") ? "publishable" : "unknown format"}` : "missing",
    anon_key_accepted_by_supabase: auth,
    site_url: siteUrl(),
    service_role_key_present: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    cert_signing_secret_present: Boolean(process.env.CERT_SIGNING_SECRET),
  });
}

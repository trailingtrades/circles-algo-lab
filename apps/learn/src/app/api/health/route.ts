import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY, siteUrl, supabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

/** Only the box itself (smart-pull.sh curls http://127.0.0.1:3001) sees configuration details.
 *  Behind nginx, X-Forwarded-For always ends with the real client address ($proxy_add_x_forwarded_for
 *  appends it; anything a client sends lands BEFORE it), and Next fills the header from the socket for
 *  a direct request. So: last hop is loopback AND the Host is loopback. */
function fromThisBox(req: NextRequest) {
  const last = (req.headers.get("x-forwarded-for") ?? "").split(",").pop()?.trim() ?? "";
  const host = (req.headers.get("host") ?? "").replace(/:\d+$/, "");
  return LOOPBACK.has(last) && (host === "127.0.0.1" || host === "localhost" || host === "[::1]");
}

/** Deployment health. The public answer is liveness plus the commit this bundle was built from ({ok, build};
 *  deploy-smart-vps.yml waits for its own commit here); no project host, key shape or secret flags, and no
 *  outbound call per hit. Never returns key material, even locally. */
export async function GET(req: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  const build = process.env.SMART_BUILD_ID ?? null;
  if (!fromThisBox(req)) return NextResponse.json({ ok: supabaseConfigured(), build }, { headers });
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
    build,
    supabase_url_host: url ? (() => { try { return new URL(url).host; } catch { return "invalid_url"; } })() : "missing",
    anon_key: key ? `${key.length} chars, ${key.startsWith("eyJ") ? "jwt" : key.startsWith("sb_publishable_") ? "publishable" : "unknown format"}` : "missing",
    anon_key_accepted_by_supabase: auth,
    site_url: siteUrl(),
    service_role_key_present: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    cert_signing_secret_present: Boolean(process.env.CERT_SIGNING_SECRET),
  }, { headers });
}

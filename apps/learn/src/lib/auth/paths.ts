/* Where an auth flow may send the browser next. Pure functions: the proxy, route handlers and
   server actions all share them, so the rules for "next" live in exactly one place. */
import { siteUrl } from "@/lib/supabase/env";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Absolute public URL of an in-app path: appUrl("/learn") -> https://learn.optionlab.co.in/smart/learn.
 *  Never built from req.url: behind nginx the standalone server believes it is 127.0.0.1:3001, which
 *  once sent every password-reset click to https://localhost:3001. */
export function appUrl(path: string): string {
  const root = siteUrl().replace(/\/+$/, "");
  return (BASE && !root.endsWith(BASE) ? root + BASE : root) + path;
}

/** Origin of the public site: the Academy landing and the static stages live there, outside the basePath. */
export const siteOrigin = () => new URL(siteUrl()).origin;

// Decoded value of ?next=. A path of plain characters only (no backslash, tab, %-escape, "//", "." or ".."
// segment), optionally a simple query. Anything cleverer is refused rather than parsed.
function tidy(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.length > 300) return null;
  const q = raw.indexOf("?");
  const path = q < 0 ? raw : raw.slice(0, q);
  const query = q < 0 ? "" : raw.slice(q + 1);
  if (!/^\/[A-Za-z0-9._~/-]*$/.test(path) || path.includes("//") || /(^|\/)\.{1,2}(\/|$)/.test(path)) return null;
  if (!/^[A-Za-z0-9._~=&-]*$/.test(query)) return null;
  return query ? `${path}?${query}` : path;
}

/** In-app page (under basePath) to continue to after sign-in or an email link; anything else -> fallback.
 *  The sign-in page itself is excluded so a bad link can never bounce in a loop. */
export function safeAppPath(raw: unknown, fallback = "/learn/home"): string {
  const p = tidy(raw);
  return p && /^\/(learn|verify)(\/|\?|$)/.test(p) && !/^\/learn\/?(\?|$)/.test(p) ? p : fallback;
}

/** Stage page outside basePath (/winners/…, /one/…): nginx's gate sends signed-out students to the
 *  sign-in page with ?next=$request_uri, and they go back there once signed in.
 *  /smart/stage0/ sits inside the basePath but is a static, nginx-gated stage page, so the absolute
 *  siteOrigin redirect is correct for it too. */
export function safeStagePath(raw: unknown): string | null {
  let p = tidy(raw);
  // The app's own proxy strips the basePath, so when IT bounces a signed-out hit on the static
  // Stage 0 pages the sign-in link carries ?next=/stage0/…, while nginx's gate sends the full
  // /smart/stage0/…. Normalise to the public path so both name the stage and return to it.
  if (p && /^\/stage0(\/|\?|$)/.test(p)) p = "/smart" + p;
  // The /stage0 -> /stage0/index.html redirect fires before the bounce, so tidy the internal
  // file name back to the directory URL the links use.
  if (p) p = p.replace(/^(\/smart\/stage0)\/index\.html(\?|$)/, "$1/$2");
  return p && /^\/(funda|winners|winners-plus|one|pro\/options|smart\/stage0)(\/|\?|$)/.test(p) ? p : null;
}

/** Which Academy stage a ?next= points at, for the sign-in heading.
 *  /winners-plus is tested before /winners: startsWith("/winners") would swallow it. */
export function stageOf(raw: unknown): "funda" | "winners" | "winners_plus" | "one" | "stage0" | "pro_options" | null {
  const p = safeStagePath(raw);
  return p ? (p.startsWith("/funda") ? "funda" : p.startsWith("/winners-plus") ? "winners_plus" : p.startsWith("/winners") ? "winners" : p.startsWith("/one") ? "one" : p.startsWith("/pro/options") ? "pro_options" : "stage0") : null;
}

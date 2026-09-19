import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_OPTIONS, SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/env";
import { safeAppPath } from "@/lib/auth/paths";

// /api/gate/* answers nginx auth_request with real 401/403 codes; a redirect here would break it.
const PUBLIC = [/^\/learn$/, /^\/learn\/invite\//, /^\/learn\/reset(\/|$)/, /^\/verify\//, /^\/api\/auth\//, /^\/api\/health$/, /^\/api\/gate\//, /^\/$/];

/** In-app redirect. NextURL keeps the /smart basePath (new URL(path, req.url) dropped it). */
function go(req: NextRequest, target: string, next?: string) {
  const u = req.nextUrl.clone();
  const q = target.indexOf("?");
  u.pathname = q < 0 ? target : target.slice(0, q);
  u.search = q < 0 ? "" : target.slice(q);
  if (next) u.searchParams.set("next", next);
  return NextResponse.redirect(u);
}

/** Refreshes the session cookie on every request and bounces unauthenticated traffic off the app shell.
 *  Account status and roles are checked server-side (lib/auth/guard.ts), not here. */
export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC.some((r) => r.test(path));
  if (!supabaseConfigured()) {
    // Demo mode is for dev and CI only. The VPS build (basePath set) must never serve the app shell without auth.
    return process.env.NEXT_PUBLIC_BASE_PATH && !isPublic ? new NextResponse("Service unavailable", { status: 503 }) : NextResponse.next();
  }
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: COOKIE_OPTIONS,
    cookies: {
      getAll: () => req.cookies.getAll(),
      // Supabase's pattern: a refreshed token goes onto the request (so this render uses it instead of
      // refreshing a second time and burning the rotated token) AND onto the response (so the browser keeps it).
      setAll: (list, headers) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, { ...options, ...COOKIE_OPTIONS }));
        Object.entries(headers ?? {}).forEach(([k, v]) => res.headers.set(k, v));
      },
    },
  });
  const { data } = await sb.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  // Signed out: to the sign-in page, remembering where they were going.
  // Signed in on the sign-in page: straight on (unless a failed email link has something to explain).
  // A stage ?next= is deliberately NOT followed there: nginx only sends a signed-in student back when the
  // gate refused them, so following it would loop; the (app) layout explains an inactive account instead.
  const out = !signedIn && !isPublic ? go(req, "/learn", path + req.nextUrl.search)
    : signedIn && path === "/learn" && !req.nextUrl.searchParams.has("error") ? go(req, safeAppPath(req.nextUrl.searchParams.get("next")))
    : null;
  if (!out) return res;
  // A token refreshed during this request must survive the redirect, or the browser keeps a spent one.
  res.cookies.getAll().forEach((c) => out.cookies.set(c));
  for (const h of ["cache-control", "expires", "pragma"]) { const v = res.headers.get(h); if (v) out.headers.set(h, v); }
  return out;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts|brand).*)"] };

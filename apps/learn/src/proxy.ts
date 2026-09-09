import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_OPTIONS, SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/env";

const PUBLIC = [/^\/learn$/, /^\/learn\/invite\//, /^\/learn\/reset/, /^\/verify\//, /^\/api\/auth\//, /^\/$/];

/** Refreshes the session cookie on every request and bounces unauthenticated traffic off the app shell. Role checks live in lib/auth/guard.ts. */
export async function proxy(req: NextRequest) {
  const res = NextResponse.next({ request: req });
  if (!supabaseConfigured()) return res; // Phase 1 demo mode: no project wired yet
  const sb = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: COOKIE_OPTIONS,
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => res.cookies.set(name, value, { ...options, ...COOKIE_OPTIONS })),
    },
  });
  const { data } = await sb.auth.getClaims();
  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC.some((r) => r.test(path));
  if (!data?.claims && !isPublic) return NextResponse.redirect(new URL("/learn", req.url));
  if (data?.claims && path === "/learn") return NextResponse.redirect(new URL("/learn/home", req.url));
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts|brand).*)"] };

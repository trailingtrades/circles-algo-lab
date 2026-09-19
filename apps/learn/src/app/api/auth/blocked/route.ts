import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { appUrl } from "@/lib/auth/paths";

export const dynamic = "force-dynamic";

/** Where requireViewer sends a session that may not use the app: suspended, never activated (an open
 *  Supabase sign-up), no profile, or a token Supabase no longer accepts. Server Components cannot clear
 *  cookies, so the session ends here and the sign-in page says why. An ACTIVE viewer is sent straight
 *  back to the course, so another site cannot use this URL to sign a student out. */
export async function GET() {
  if (!supabaseConfigured()) return NextResponse.redirect(appUrl("/learn"));
  const sb = await createClient();
  const { data: { user }, error } = await sb.auth.getUser();
  const { data: p } = user ? await sb.from("profiles").select("status").eq("id", user.id).maybeSingle() : { data: null };
  if (p?.status === "active") return NextResponse.redirect(appUrl("/learn/home"));
  // Always clear the cookies, even when getUser failed: a locally valid but revoked token would
  // otherwise pass the proxy, fail the page, and bounce here forever.
  await sb.auth.signOut({ scope: "local" });
  // Suspension also bans the auth user, and Supabase may then refuse the token outright ("user_banned").
  const why = p?.status === "suspended" || error?.code === "user_banned" ? "?suspended=1" : user ? "?inactive=1" : "";
  return NextResponse.redirect(appUrl(`/learn${why}`));
}

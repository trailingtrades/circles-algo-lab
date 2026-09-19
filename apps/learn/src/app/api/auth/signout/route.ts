import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { appUrl } from "@/lib/auth/paths";

export const dynamic = "force-dynamic";

/** Sign-out for the static stages (WINNERS at /winners/, O.N.E at /one/): their "Sign out" button is a
 *  plain link to /smart/api/auth/signout, because the session they rely on belongs to this app. Ends the
 *  session on this device (like the Profile button) and lands on the sign-in page.
 *  Only a same-site request signs out: a link on another website (Sec-Fetch-Site: cross-site) must not
 *  be able to log a student out, so it is sent to Home instead. */
async function handle(req: NextRequest) {
  if (req.headers.get("sec-fetch-site") === "cross-site") return NextResponse.redirect(appUrl("/learn/home"), 303);
  if (supabaseConfigured()) {
    const sb = await createClient();
    await sb.auth.signOut({ scope: "local" });
  }
  return NextResponse.redirect(appUrl("/learn"), 303);
}

export const GET = handle;
export const POST = handle;

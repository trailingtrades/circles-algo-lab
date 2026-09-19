import "server-only";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/* Rate limit for the sign-in and reset actions, checked inside the action itself. nginx's smart_auth zone
   (deploy-vps/smart-app.conf) only sees POSTs to /smart/learn and /smart/learn/reset, but Next runs a
   server action at ANY page that registers it: the (app) layout imports signOut from app/learn/actions.ts,
   so signIn and requestReset are also callable at /smart/learn/home, /smart/learn/profile and the rest,
   where nginx does not count them. Same store as the public verify page (verify_rate_ok: sliding 60 s
   window per hashed key); the prefixes below keep these buckets apart from the verify page's. */

// Per client address, sign-in and reset together: nginx allows 10 a minute plus a burst of 10, so at most
// 20 in a minute. If the nginx burst is ever raised for a class signing in from one Wi-Fi, raise this too.
const IP_PER_MIN = 20;
// Per email address, from any number of addresses: slows password guessing on one account.
const EMAIL_PER_MIN = 10;

const key = (kind: string, v: string) => createHash("sha256").update(`smart-auth-${kind}:${v}`).digest("hex");

/** false when this address, or this email, has made too many sign-in/reset attempts in the last minute.
 *  Fails open (true) when the store cannot be reached, like the verify page: the Supabase call behind it
 *  would fail on its own. */
export async function authRateOk(email: string): Promise<boolean> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return true;
  const h = await headers();
  // nginx sets X-Real-IP to the connecting address (a client-sent value is overwritten); the app listens
  // on 127.0.0.1 only. A server action Next forwards to another page's worker carries the same headers.
  const ip = h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",").pop()?.trim() || "unknown";
  try {
    const admin = createAdminClient();
    const byIp = await admin.rpc("verify_rate_ok", { p_ip_hash: key("ip", ip), p_limit: IP_PER_MIN });
    if (byIp.data === false) return false; // a blocked address does not also use up the email's allowance
    const byEmail = await admin.rpc("verify_rate_ok", { p_ip_hash: key("email", email), p_limit: EMAIL_PER_MIN });
    return byEmail.data !== false;
  } catch {
    return true;
  }
}

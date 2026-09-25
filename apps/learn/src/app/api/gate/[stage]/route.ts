import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient, getViewer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STAGES = new Set(["winners", "winners_plus", "one", "stage0", "pro_options"]);
// Per-student answer (name, expiry): never cacheable by nginx or anything in between.
const NO_STORE = { "Cache-Control": "private, no-store" };
// X-Gate-Reason lets nginx pass WHY to the page it redirects to (auth_request_set $gate_reason
// $upstream_http_x_gate_reason), so a student with a future start date is told so instead of bouncing silently.
const deny = (status: 401 | 403, reason: string) => new NextResponse(null, { status, headers: { ...NO_STORE, "X-Gate-Reason": reason } });

/**
 * nginx auth_request target gating the static Academy stages on the VPS (§ stage_access).
 * 200 = serve the page, 401 = not signed in (nginx redirects to the SMART sign-in),
 * 403 = signed in but not entitled (nginx redirects to SMART home; X-Gate-Reason says why).
 * Mentors and admins always pass. Every allowed hit is logged to stage_visits.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ stage: string }> }) {
  const { stage } = await ctx.params;
  if (!STAGES.has(stage)) return new NextResponse(null, { status: 404, headers: NO_STORE });
  const v = await getViewer();
  if (!v || v.status !== "active") return deny(401, v ? "inactive" : "signed_out");
  let expiresAt: string | null = null;
  // stage0 needs sign-in only (any active account passes: student/mentor/admin), never a stage_access grant.
  if (v.role === "student" && stage !== "stage0") {
    const sb = await createClient();
    const { data } = await sb.from("stage_access").select("expires_at,starts_at").eq("user_id", v.id).eq("stage", stage).maybeSingle();
    if (!data) return deny(403, "no_access");
    if (data.starts_at && new Date(data.starts_at).getTime() > Date.now()) return deny(403, "not_started");
    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return deny(403, "expired");
    expiresAt = data.expires_at;
  }
  try {
    await createAdminClient().from("stage_visits").insert({ user_id: v.id, stage });
  } catch {
    // Logging must never block a paying student from their course page.
  }
  // nginx auth_request ignores the body; the stage pages fetch this same URL to learn who the
  // student is (name for greetings/leaderboard, expiry) instead of asking for an access code.
  // `uid` is a stable, opaque key for this account (not the database id), so WINNERS and O.N.E can keep
  // local progress per learner on a shared phone instead of per browser.
  const uid = createHash("sha256").update(`5c-stage-uid:${v.id}`).digest("hex").slice(0, 24);
  return NextResponse.json({ name: v.full_name, expires_at: expiresAt, uid }, { status: 200, headers: NO_STORE });
}

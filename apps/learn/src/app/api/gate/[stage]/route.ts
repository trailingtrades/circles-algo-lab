import { NextResponse } from "next/server";
import { createClient, getViewer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STAGES = new Set(["winners", "one"]);

/**
 * nginx auth_request target gating the static Academy stages on the VPS (§ stage_access).
 * 200 = serve the page, 401 = not signed in (nginx redirects to the SMART sign-in),
 * 403 = signed in but not entitled (nginx redirects home with a notice).
 * Mentors and admins always pass. Every allowed hit is logged to stage_visits.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ stage: string }> }) {
  const { stage } = await ctx.params;
  if (!STAGES.has(stage)) return new NextResponse(null, { status: 404 });
  const v = await getViewer();
  if (!v || v.status !== "active") return new NextResponse(null, { status: 401 });
  if (v.role === "student") {
    const sb = await createClient();
    const { data } = await sb.from("stage_access").select("expires_at").eq("user_id", v.id).eq("stage", stage).maybeSingle();
    if (!data) return new NextResponse(null, { status: 403 });
    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return new NextResponse(null, { status: 403 });
  }
  try {
    await createAdminClient().from("stage_visits").insert({ user_id: v.id, stage });
  } catch {
    // Logging must never block a paying student from their course page.
  }
  return new NextResponse(null, { status: 200 });
}

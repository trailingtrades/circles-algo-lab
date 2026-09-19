import "server-only";
import { redirect } from "next/navigation";
import { getViewer, type Viewer } from "@/lib/supabase/server";

/** Server-side gate for every signed-in screen and action. Only ACTIVE accounts get through: a
 *  suspended user, a never-activated sign-up, or a session with no profile is sent to
 *  /api/auth/blocked, which ends the session (Server Components cannot clear cookies) and explains
 *  why on the sign-in page. Redirecting to /learn instead would loop, because the proxy sends any
 *  signed-in visitor of /learn back to /learn/home. */
export async function requireViewer(roles?: Viewer["role"][]): Promise<Viewer> {
  const v = await getViewer();
  if (!v || v.status !== "active") redirect("/api/auth/blocked");
  if (roles && !roles.includes(v.role)) redirect("/learn/home");
  return v;
}

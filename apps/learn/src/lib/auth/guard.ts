import "server-only";
import { redirect } from "next/navigation";
import { getViewer, type Viewer } from "@/lib/supabase/server";

/** Server-side role gate. Suspended users are signed out of the app shell immediately (§5). */
export async function requireViewer(roles?: Viewer["role"][]): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect("/learn");
  if (v.status === "suspended") redirect("/learn?suspended=1");
  if (roles && !roles.includes(v.role)) redirect("/learn/home");
  return v;
}

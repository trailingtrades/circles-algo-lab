/* Stage 1 class files (week handout PDFs, week decks) for signed-in learners: /learn/files/stage1/<name>.
 * The files live in apps/learn/files/stage1/ (lib/content/stage1-files.ts), never in public/, so nothing is served
 * without a session. proxy.ts already sends a visitor with no session to the sign-in page; this handler also checks
 * that the account is active (route handlers do not run the (app) layout) and applies the same week rule as the
 * printable handout (lib/progress/stage1-access.ts): a week's files open with its first day; staff always.
 * Only plain file names in that one folder are served (no paths, no dot-files). */
import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import { STAGE1_TYPES, stage1FilePath, stage1FileWeek } from "@/lib/content/stage1-files";
import { loadLearnerState } from "@/lib/progress/load";
import { weekGate } from "@/lib/progress/stage1-access";
import { getViewer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const text = (status: number, body: string) => new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  let name = file;
  try { name = decodeURIComponent(file); } catch { return text(404, "Not found"); }
  const abs = stage1FilePath(name);
  let size = 0;
  try { if (abs) { const st = statSync(/*turbopackIgnore: true*/ abs); if (st.isFile()) size = st.size; } } catch { /* missing: 404 below */ }
  if (!abs || !size) return text(404, "Not found");

  const live = supabaseConfigured();
  const v = live ? await getViewer() : null;
  if (live && !v) return text(401, "Please sign in to open this file.");
  if (live && v!.status !== "active") return text(403, "This account is not active. Please contact your mentor.");
  const staff = v?.role === "mentor" || v?.role === "admin";
  const week = stage1FileWeek(name);
  if (week != null && !staff) {
    const { state } = await loadLearnerState();
    if (weekGate(state, week, false)) return text(403, `Week ${week} files open with the first day of Week ${week}.`);
  }

  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  const body = Readable.toWeb(createReadStream(/*turbopackIgnore: true*/ abs)) as unknown as ReadableStream<Uint8Array>;
  return new Response(body, {
    headers: {
      "Content-Type": STAGE1_TYPES[ext] ?? "application/octet-stream",
      "Content-Length": String(size),
      // A PDF opens in the browser tab (the Resources and session pages open it in a new tab); a deck downloads.
      "Content-Disposition": `${ext === "pdf" ? "inline" : "attachment"}; filename="${name}"`,
      // Personal to a signed-in learner, re-checked on every open (a re-export keeps the same name).
      "Cache-Control": "private, no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

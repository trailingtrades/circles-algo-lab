import "server-only";
import { liveQuizKey, liveQuizPublic, liveSession } from "@/lib/content/live";
import { getViewer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { isLang, type Lang } from "@/lib/i18n/lang";
import type { PrintDay } from "../_components/Handout";

/** Mentors and admins see every week and day (published or not), like the admin content pages. */
export async function viewerIsStaff(): Promise<boolean> {
  if (!supabaseConfigured()) return false;
  const role = (await getViewer())?.role;
  return role === "mentor" || role === "admin";
}

/** ?lang=en|hi|dv picks the edition; without it the reader's own language. */
export const printLang = (q: string | string[] | undefined, fallback: Lang): Lang => (isLang(q) ? q : fallback);

/** One day as the app shows it: the live session (DB copy when connected, else content JSON), its public quiz and,
 *  for the answers page, its key (server-side, same order as the quiz). */
export async function loadPrintDay(n: number): Promise<PrintDay | null> {
  const [s, quiz, key] = await Promise.all([liveSession(n), liveQuizPublic(n), liveQuizKey(n)]);
  return s ? { s, quiz, key } : null;
}

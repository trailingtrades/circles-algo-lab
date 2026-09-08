import "server-only";
import { createClient, getViewer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { SESSIONS, LEVELS, type LevelSlug } from "@/lib/content/course";
import type { LearnerState } from "./gating";

/** Demo state used when no Supabase project is wired (Phase 1–3 preview): sessions 1–2 done, 3 in progress. */
export const DEMO: LearnerState = {
  sessions: { 1: { watched_pct: 100, handout_opened: true, quiz_submitted: true, journal_saved: true, completed_at: "2026-10-01" }, 2: { watched_pct: 92, handout_opened: true, quiz_submitted: true, journal_saved: true, completed_at: "2026-10-02" }, 3: { watched_pct: 40, handout_opened: false, quiz_submitted: false, journal_saved: false, completed_at: null } },
  certificates: [], overrides: [], suspended: false,
};

export async function loadLearnerState(): Promise<{ state: LearnerState; demo: boolean; lang: "en" | "hi" }> {
  if (!supabaseConfigured()) return { state: DEMO, demo: true, lang: "en" };
  const v = await getViewer();
  if (!v) return { state: DEMO, demo: true, lang: "en" };
  const sb = await createClient();
  const [{ data: prog }, { data: attempts }, { data: journals }, { data: certs }, { data: overrides }, { data: sess }] = await Promise.all([
    sb.from("session_progress").select("session_id,watched_pct,handout_opened,completed_at").eq("user_id", v.id),
    sb.from("attempts").select("session_id,submitted_at").eq("user_id", v.id).not("session_id", "is", null).not("submitted_at", "is", null),
    sb.from("journal_entries").select("session_id").eq("user_id", v.id).not("session_id", "is", null),
    sb.from("certificates").select("levels(slug)").eq("user_id", v.id).eq("status", "issued"),
    sb.from("level_unlocks").select("levels(slug)").eq("user_id", v.id),
    sb.from("sessions").select("id,number"),
  ]);
  const numOf = new Map((sess ?? []).map((s) => [s.id as string, s.number as number]));
  const state: LearnerState = { sessions: {}, certificates: [], overrides: [], suspended: v.status === "suspended" };
  const ensure = (n: number) => (state.sessions[n] ??= { watched_pct: 0, handout_opened: false, quiz_submitted: false, journal_saved: false, completed_at: null });
  for (const p of prog ?? []) { const n = numOf.get(p.session_id); if (n) Object.assign(ensure(n), { watched_pct: p.watched_pct, handout_opened: p.handout_opened, completed_at: p.completed_at }); }
  for (const a of attempts ?? []) { const n = numOf.get(a.session_id!); if (n) ensure(n).quiz_submitted = true; }
  for (const j of journals ?? []) { const n = numOf.get(j.session_id!); if (n) ensure(n).journal_saved = true; }
  const slug = (r: unknown) => ((r as { levels?: { slug?: string } | null })?.levels?.slug ?? null) as LevelSlug | null;
  for (const c of certs ?? []) { const s = slug(c); if (s) state.certificates.push(s); }
  for (const o of overrides ?? []) { const s = slug(o); if (s) state.overrides.push(s); }
  void SESSIONS; void LEVELS;
  return { state, demo: false, lang: v.lang };
}

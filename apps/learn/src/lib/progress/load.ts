import "server-only";
import { cache } from "react";
import { createClient, getViewer, type Viewer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LevelSlug } from "@/lib/content/course";
import type { LearnerState } from "./gating";
import { getLang } from "@/lib/i18n/server";
import type { Lang } from "@/lib/i18n/lang";

/** Demo state used when no Supabase project is wired (Phase 1–3 preview): sessions 1–2 done, 3 in progress. */
export const DEMO: LearnerState = {
  sessions: { 1: { watched_pct: 100, handout_opened: true, quiz_submitted: true, journal_saved: true, completed_at: "2026-10-01" }, 2: { watched_pct: 92, handout_opened: true, quiz_submitted: true, journal_saved: true, completed_at: "2026-10-02" }, 3: { watched_pct: 40, handout_opened: false, quiz_submitted: false, journal_saved: false, completed_at: null } },
  certificates: [], overrides: [], suspended: false,
};

/** Session id -> number and publish flag. Read with the service role when it is configured: under RLS a student
 *  cannot see an unpublished row, so its progress used to vanish from the state and relock every later session.
 *  The row is course structure, not learner data, so the service-role read exposes nothing. */
async function sessionIndex(sb: Awaited<ReturnType<typeof createClient>>) {
  const cols = "id,number,is_published";
  const { data } = process.env.SUPABASE_SERVICE_ROLE_KEY ? await createAdminClient().from("sessions").select(cols) : await sb.from("sessions").select(cols);
  return (data ?? []) as { id: string; number: number; is_published: boolean }[];
}

/** Memoised per request (Home reaches it twice: the page and loadScore). Returns the viewer too, so pages need no
 *  extra auth round trip for the learner's name. */
export const loadLearnerState = cache(async (): Promise<{ state: LearnerState; demo: boolean; lang: Lang; viewer: Viewer | null }> => {
  if (!supabaseConfigured()) return { state: DEMO, demo: true, lang: await getLang(), viewer: null };
  const v = await getViewer();
  if (!v) return { state: DEMO, demo: true, lang: await getLang(), viewer: null };
  const sb = await createClient();
  const [{ data: prog }, { data: attempts }, { data: journals }, { data: certs }, { data: overrides }, sess, { data: exams }, { data: grants }] = await Promise.all([
    sb.from("session_progress").select("session_id,watched_pct,handout_opened,completed_at").eq("user_id", v.id),
    sb.from("attempts").select("session_id,submitted_at").eq("user_id", v.id).not("session_id", "is", null).not("submitted_at", "is", null),
    sb.from("journal_entries").select("session_id").eq("user_id", v.id).not("session_id", "is", null),
    sb.from("certificates").select("levels(slug)").eq("user_id", v.id).eq("status", "issued"),
    sb.from("level_unlocks").select("levels(slug)").eq("user_id", v.id),
    sessionIndex(sb),
    sb.from("attempts").select("passed,exams(levels(slug),weeks(number))").eq("user_id", v.id).not("exam_id", "is", null).not("submitted_at", "is", null),
    sb.from("stage_access").select("*").eq("user_id", v.id),
  ]);
  const numOf = new Map(sess.map((s) => [s.id, s.number]));
  const state: LearnerState = { sessions: {}, certificates: [], overrides: [], suspended: v.status === "suspended" };
  // No rows back (read failed, or nothing seeded yet): keep the JSON flags rather than lock the whole course.
  if (sess.length) state.published = Object.fromEntries(sess.map((s) => [s.number, s.is_published]));
  const ensure = (n: number) => (state.sessions[n] ??= { watched_pct: 0, handout_opened: false, quiz_submitted: false, journal_saved: false, completed_at: null });
  for (const p of prog ?? []) { const n = numOf.get(p.session_id); if (n) Object.assign(ensure(n), { watched_pct: p.watched_pct, handout_opened: p.handout_opened, completed_at: p.completed_at }); }
  for (const a of attempts ?? []) { const n = numOf.get(a.session_id!); if (n) ensure(n).quiz_submitted = true; }
  for (const j of journals ?? []) { const n = numOf.get(j.session_id!); if (n) ensure(n).journal_saved = true; }
  const slug = (r: unknown) => ((r as { levels?: { slug?: string } | null })?.levels?.slug ?? null) as LevelSlug | null;
  for (const c of certs ?? []) { const s = slug(c); if (s) state.certificates.push(s); }
  for (const o of overrides ?? []) { const s = slug(o); if (s) state.overrides.push(s); }
  // Exam key = content key ("foundation-w2" / "foundation-final"), so pages can match it against EXAMS.
  state.exams = {};
  for (const a of (exams ?? []) as { passed: boolean | null; exams: unknown }[]) {
    const e = a.exams as { levels?: { slug?: string } | null; weeks?: { number?: number } | null } | null;
    if (!e?.levels?.slug) continue;
    const key = `${e.levels.slug}-${e.weeks?.number ? `w${e.weeks.number}` : "final"}`;
    state.exams[key] = { passed: (state.exams[key]?.passed ?? false) || a.passed === true };
  }
  // A grant counts inside its window only (starts_at arrived with migration 0009; select * keeps older DBs working).
  const now = Date.now();
  state.stages = ((grants ?? []) as { stage: string; starts_at?: string | null; expires_at?: string | null }[])
    .filter((g) => (!g.starts_at || Date.parse(g.starts_at) <= now) && (!g.expires_at || Date.parse(g.expires_at) > now)).map((g) => g.stage);
  return { state, demo: false, lang: await getLang(v.lang), viewer: v };
});

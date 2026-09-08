"use server";
import { revalidatePath } from "next/cache";
import { getViewer, createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/supabase/env";
import { getSession, quizAnswerKey } from "@/lib/content/course";

export type ActState = { error?: string; ok?: string };
export type QuizResult = { error?: string; score?: number; max?: number; results?: { idx: number; chosen: number; correct: number; right: boolean; explanation: string }[] };

async function ctx(n: number) {
  if (!supabaseConfigured()) return { error: "Preview mode: progress is not saved until the Supabase project is connected." } as const;
  const v = await getViewer();
  if (!v || v.status !== "active") return { error: "Sign in required." } as const;
  const s = getSession(n);
  if (!s) return { error: "Session not found." } as const;
  const sb = await createClient();
  const { data: row } = await sb.from("sessions").select("id").eq("number", n).maybeSingle();
  if (!row) return { error: "Session not seeded." } as const;
  return { v, sb, sessionId: row.id as string, s } as const;
}

export async function markWatched(n: number, pct: number): Promise<ActState> {
  const c = await ctx(n); if ("error" in c) return c;
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  const { error } = await c.sb.from("session_progress").upsert({ user_id: c.v.id, session_id: c.sessionId, watched_pct: p, status: "in_progress" }, { onConflict: "user_id,session_id", ignoreDuplicates: false });
  if (error) return { error: error.message };
  return { ok: "saved" };
}

export async function markHandoutOpened(n: number): Promise<ActState> {
  const c = await ctx(n); if ("error" in c) return c;
  const { error } = await c.sb.from("session_progress").upsert({ user_id: c.v.id, session_id: c.sessionId, handout_opened: true, status: "in_progress" }, { onConflict: "user_id,session_id" });
  if (error) return { error: error.message };
  return { ok: "saved" };
}

/** Grades server-side against the answer key; the client never sees correct_index. One attempt per session (§12 QuizBlock: one-shot). */
export async function submitQuiz(n: number, answers: Record<number, number>): Promise<QuizResult> {
  const c = await ctx(n); if ("error" in c) return c;
  const key = quizAnswerKey(n);
  if (!key.length) return { error: "Is session ka quiz abhi nahi bana." };
  const { data: prior } = await c.sb.from("attempts").select("id").eq("user_id", c.v.id).eq("session_id", c.sessionId).not("submitted_at", "is", null).maybeSingle();
  if (prior) return { error: "Quiz pehle hi submit ho chuka hai." };
  let score = 0; const max = key.reduce((a, q) => a + q.marks, 0);
  const results = key.map((q, idx) => { const chosen = Number(answers[idx] ?? -1); const right = chosen === q.correct_index; if (right) score += q.marks; return { idx, chosen, correct: q.correct_index, right, explanation: c.v.lang === "hi" ? q.explanation_hi : q.explanation_en }; });
  // Write the graded attempt with the service role (the client-side guard trigger would null the score).
  const admin = createAdminClient();
  const { error } = await admin.from("attempts").insert({ user_id: c.v.id, session_id: c.sessionId, answers, score, max_score: max, passed: score / max >= 0.5, submitted_at: new Date().toISOString(), attempt_no: 1 });
  if (error) return { error: error.message };
  await c.sb.from("session_progress").upsert({ user_id: c.v.id, session_id: c.sessionId, status: "in_progress" }, { onConflict: "user_id,session_id" });
  await maybeComplete(c.v.id, c.sessionId, n);
  revalidatePath(`/learn/session/${n}`); revalidatePath("/learn/path"); revalidatePath("/learn/home");
  return { score, max, results };
}

export async function saveJournal(n: number, body: string, kind: "reflection" | "galti_log" | "friday_review"): Promise<ActState> {
  const c = await ctx(n); if ("error" in c) return c;
  const text = body.trim();
  if (text.length < 10) return { error: "Kam se kam 10 characters likhiye." };
  if (text.length > 4000) return { error: "4000 characters se kam rakhiye." };
  const { error } = await c.sb.from("journal_entries").insert({ user_id: c.v.id, session_id: c.sessionId, kind, body: text });
  if (error) return { error: error.message };
  await c.sb.from("session_progress").upsert({ user_id: c.v.id, session_id: c.sessionId, status: "in_progress" }, { onConflict: "user_id,session_id" });
  await maybeComplete(c.v.id, c.sessionId, n);
  revalidatePath(`/learn/session/${n}`); revalidatePath("/learn/path"); revalidatePath("/learn/home");
  return { ok: "Journal saved." };
}

/** Flip session_progress to complete once quiz + journal both exist. Service role so the row can be finalised regardless of client state. */
async function maybeComplete(userId: string, sessionId: string, n: number) {
  const admin = createAdminClient();
  const [{ count: q }, { count: j }] = await Promise.all([
    admin.from("attempts").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("session_id", sessionId).not("submitted_at", "is", null),
    admin.from("journal_entries").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("session_id", sessionId),
  ]);
  if ((q ?? 0) > 0 && (j ?? 0) > 0) {
    await admin.from("session_progress").upsert({ user_id: userId, session_id: sessionId, status: "complete", completed_at: new Date().toISOString() }, { onConflict: "user_id,session_id" });
    void n;
  }
}

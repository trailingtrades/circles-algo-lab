"use server";
import { revalidatePath } from "next/cache";
import { getViewer, createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/supabase/env";
import { getExam, examAnswerKey } from "@/lib/content/course";
import { awardExam } from "@/lib/scoring/award";

export type ExamAttempt = { id: string; attempt_no: number; started_at: string; deadline_at: string; answers: Record<number, number>; submitted_at: string | null; score: number | null; max_score: number | null };
export type ExamResult = { error?: string; score?: number; max?: number; passed?: boolean; band?: "distinction" | "pass" | "fail"; results?: { idx: number; chosen: number; correct: number; right: boolean; explanation: string }[] };

async function ctx(key: string) {
  if (!supabaseConfigured()) return { error: "Preview mode: exams need the Supabase project." } as const;
  const v = await getViewer(); if (!v || v.status !== "active") return { error: "Sign in required." } as const;
  const meta = getExam(key); if (!meta) return { error: "Exam not found." } as const;
  const sb = await createClient();
  const { data: lvl } = await sb.from("levels").select("id").eq("slug", meta.level).single();
  let q = sb.from("exams").select("id,time_limit_min,attempts_allowed,total_marks,pass_marks,distinction_marks").eq("level_id", lvl!.id);
  q = meta.week ? q.eq("week_id", (await sb.from("weeks").select("id").eq("level_id", lvl!.id).eq("number", meta.week).single()).data!.id) : q.is("week_id", null);
  const { data: row } = await q.maybeSingle(); if (!row) return { error: "Exam not seeded." } as const;
  return { v, sb, meta, row } as const;
}

/** Resume the open attempt or start a new one (attempt limit enforced). Deadline = now + time limit; the client timer is cosmetic, the server clock decides. */
export async function startOrResume(key: string): Promise<{ error?: string; attempt?: ExamAttempt; attemptsUsed?: number }> {
  const c = await ctx(key); if ("error" in c) return c;
  const { data: all } = await c.sb.from("attempts").select("id,attempt_no,started_at,deadline_at,answers,submitted_at,score,max_score").eq("user_id", c.v.id).eq("exam_id", c.row.id).order("attempt_no", { ascending: false });
  const open = (all ?? []).find((a) => !a.submitted_at);
  if (open) return { attempt: open as ExamAttempt, attemptsUsed: all!.length };
  if ((all?.length ?? 0) >= c.row.attempts_allowed) return { error: `Attempt limit reached (${c.row.attempts_allowed}).`, attemptsUsed: all!.length };
  const deadline = new Date(Date.now() + c.row.time_limit_min * 60_000).toISOString();
  const { data: created, error } = await c.sb.from("attempts").insert({ user_id: c.v.id, exam_id: c.row.id, attempt_no: (all?.length ?? 0) + 1, deadline_at: deadline, answers: {} }).select("id,attempt_no,started_at,deadline_at,answers,submitted_at,score,max_score").single();
  if (error) return { error: error.message };
  return { attempt: created as ExamAttempt, attemptsUsed: (all?.length ?? 0) + 1 };
}

/** Autosave (every 15s from the client). Rejected once submitted; the guard trigger also blocks it. */
export async function autosave(key: string, attemptId: string, answers: Record<number, number>): Promise<{ ok: boolean }> {
  const c = await ctx(key); if ("error" in c) return { ok: false };
  const { error } = await c.sb.from("attempts").update({ answers, autosaved_at: new Date().toISOString() }).eq("id", attemptId).eq("user_id", c.v.id).is("submitted_at", null);
  return { ok: !error };
}

/** One submit. Graded server-side; late submissions are graded but lose the on-time discipline point. */
export async function submitExam(key: string, attemptId: string, answers: Record<number, number>): Promise<ExamResult> {
  const c = await ctx(key); if ("error" in c) return c;
  const { data: a } = await c.sb.from("attempts").select("id,attempt_no,deadline_at,submitted_at").eq("id", attemptId).eq("user_id", c.v.id).maybeSingle();
  if (!a) return { error: "Attempt not found." }; if (a.submitted_at) return { error: "Already submitted." };
  const keyRows = examAnswerKey(key); if (!keyRows.length) return { error: "Is exam ka question bank abhi nahi bana." };
  let score = 0; const max = keyRows.reduce((s, q) => s + q.marks, 0);
  const results = keyRows.map((q, idx) => { const chosen = Number(answers[idx] ?? -1); const right = chosen === q.correct_index; if (right) score += q.marks; return { idx, chosen, correct: q.correct_index, right, explanation: c.v.lang === "hi" ? q.explanation_hi : q.explanation_en }; });
  const pct = score / max; const passed = pct >= 0.6; const band = pct >= 30 / 36 ? "distinction" : passed ? "pass" : "fail";
  const now = new Date(); const onTime = now <= new Date(a.deadline_at);
  const admin = createAdminClient();
  const { error } = await admin.from("attempts").update({ answers, score, max_score: max, passed, submitted_at: now.toISOString() }).eq("id", attemptId);
  if (error) return { error: error.message };
  await awardExam(c.v.id, c.meta.level, c.row.id, attemptId, score, max, a.attempt_no, c.meta.week === null, onTime);
  revalidatePath("/learn/home"); revalidatePath("/learn/score"); revalidatePath("/learn/leaderboard");
  return { score, max, passed, band, results };
}

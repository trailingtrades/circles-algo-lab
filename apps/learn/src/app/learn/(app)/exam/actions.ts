"use server";
import { revalidatePath } from "next/cache";
import { examAnswerKey } from "@/lib/content/course";
import { tr } from "@/lib/i18n/lang";
import { MSG, limitMsg, examCtx, listAttempts, closeAttempt, closeExpired, cleanAnswers, expired, bandOf, questionsFor } from "./server";
import type { Answers, ExamResult, StartResult } from "./types"; // shared shapes live in ./types: a "use server" file may export only async functions

const refresh = () => { revalidatePath("/learn/home"); revalidatePath("/learn/score"); revalidatePath("/learn/leaderboard"); revalidatePath("/learn/certificate"); };

/** Called only from the Start / Resume button. Resumes the open attempt, or starts one if the limit allows (checked here, on the server).
 *  Deadline = server now + time limit. Two tabs pressing Start together end up on the same attempt. */
export async function startOrResume(key: string): Promise<StartResult> {
  const c = await examCtx(key); if ("error" in c) return { error: tr(c.error, c.lang) };
  const x = (l: Parameters<typeof tr>[0]) => tr(l, c.lang);
  if (!examAnswerKey(key).length) return { error: x(MSG.notReady) };
  if (await closeExpired(c, key)) refresh();
  const all = await listAttempts(c), sub = all.filter((a) => a.submitted_at);
  if (sub.some((a) => bandOf(a, c.row) !== "fail")) return { error: x(MSG.passed) };
  if (sub.length >= c.row.attempts_allowed) return { error: x(limitMsg(c.row.attempts_allowed)) };
  const left = c.row.attempts_allowed - sub.length - 1;
  const live = all.find((a) => !a.submitted_at);
  if (live) return { attempt: { ...live, now: Date.now() }, attemptsLeft: left, questions: questionsFor(key, c.lang) };
  const deadline = new Date(Date.now() + c.row.time_limit_min * 60_000).toISOString();
  const { data: made, error } = await c.admin.from("attempts").insert({ user_id: c.v.id, exam_id: c.row.id, attempt_no: sub.length + 1, deadline_at: deadline, answers: {} }).select("id").single();
  if (error && error.code !== "23505") return { error: x(MSG.saveFailed) }; // 23505: a unique (user, exam, attempt_no) index caught the twin tab
  // Two tabs can both reach the insert. Keep the oldest open attempt and drop the empty twin this call just made.
  const open = (await listAttempts(c)).filter((a) => !a.submitted_at), keep = open[0];
  if (made && keep && keep.id !== made.id) await c.admin.from("attempts").delete().eq("id", made.id).eq("user_id", c.v.id).is("submitted_at", null);
  return keep ? { attempt: { ...keep, now: Date.now() }, attemptsLeft: left, questions: questionsFor(key, c.lang) } : { error: x(MSG.saveFailed) };
}

/** Autosave from the runner (every 15 s, and when the tab is hidden). Refused once the attempt is submitted or its time plus grace is over. */
export async function autosave(key: string, attemptId: string, answers: Answers): Promise<{ ok: boolean; closed?: boolean }> {
  const c = await examCtx(key); if ("error" in c) return { ok: false };
  const a = (await listAttempts(c)).find((t) => t.id === attemptId);
  if (!a || a.submitted_at || expired(a, c.row)) return { ok: false, closed: true };
  const { error } = await c.admin.from("attempts").update({ answers: cleanAnswers(answers, key), autosaved_at: new Date().toISOString() }).eq("id", a.id).eq("user_id", c.v.id).eq("exam_id", c.row.id).is("submitted_at", null);
  return { ok: !error };
}

/** One submit, graded here. The attempt must be this learner's, for THIS exam, and still open. Late answers are not counted (see GRACE_MS). */
export async function submitExam(key: string, attemptId: string, answers: Answers): Promise<ExamResult> {
  const c = await examCtx(key); if ("error" in c) return { error: tr(c.error, c.lang) };
  const a = (await listAttempts(c)).find((t) => t.id === attemptId);
  if (!a) return { error: tr(MSG.missing, c.lang) };
  if (a.submitted_at) return { error: tr(MSG.already, c.lang) };
  const r = await closeAttempt(c, key, a, answers);
  if (!r.error) refresh();
  return r;
}

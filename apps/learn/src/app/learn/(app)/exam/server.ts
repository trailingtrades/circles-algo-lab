import "server-only";
import { getViewer, type Viewer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/supabase/env";
import { getExam, examAnswerKey, examPublic, pick3, optionText, type ExamMeta } from "@/lib/content/course";
import { awardExam } from "@/lib/scoring/award";
import { examBand } from "@/lib/scoring/rules";
import { examTitle } from "@/lib/scoring/next";
import { getLang } from "@/lib/i18n/server";
import { t3, tr, type L, type Lang } from "@/lib/i18n/lang";
import type { Answers, Band, ExamAttempt, ExamQuestion, ExamResult, QResult } from "./types";

/* Server side of the timed exam. The server clock decides: the browser countdown is only a display.
 * Every write goes through the service role after the viewer is checked here, so a learner's own
 * PostgREST token can't be used to move a deadline, renumber an attempt or grade under another exam. */

/** Answers that reach the server later than deadline + GRACE are not counted; the attempt is graded on what was autosaved in time. 30 s covers the auto-submit round trip. */
export const GRACE_MS = 30_000;
const COLS = "id,attempt_no,started_at,deadline_at,answers,submitted_at,score,max_score";

export const MSG = {
  preview: t3("Exams open once you sign in.", "Sign in karne ke baad exam khulega.", "साइन इन करने के बाद एग्ज़ाम खुलेगा।"),
  signIn: t3("Please sign in again to continue.", "Aage badhne ke liye dobara sign in kijiye.", "आगे बढ़ने के लिए फिर से साइन इन कीजिए।"),
  inactive: t3("Your account is not active right now. Please contact your mentor.", "Aapka account abhi active nahi hai. Apne mentor se baat kijiye.", "आपका अकाउंट अभी एक्टिव नहीं है। अपने मेंटर से बात कीजिए।"),
  notFound: t3("This exam does not exist.", "Ye exam maujood nahi hai.", "यह एग्ज़ाम मौजूद नहीं है।"),
  notReady: t3("This exam is not open yet. Your mentor will share the date.", "Ye exam abhi khula nahi hai. Taareekh aapke mentor batayenge.", "यह एग्ज़ाम अभी खुला नहीं है। तारीख आपके मेंटर बताएँगे।"),
  passed: t3("You have already passed this exam, so there is no retake.", "Ye exam aap pass kar chuke hain, isliye retake nahi hai.", "यह एग्ज़ाम आप पास कर चुके हैं, इसलिए दोबारा नहीं देना है।"),
  already: t3("This attempt was already submitted, perhaps from another tab.", "Ye attempt pehle hi submit ho chuka hai, shayad doosre tab se.", "यह अटेम्प्ट पहले ही सबमिट हो चुका है, शायद दूसरे टैब से।"),
  missing: t3("We could not find this attempt. Reload the page and try again.", "Ye attempt nahi mila. Page reload karke dobara try kijiye.", "यह अटेम्प्ट नहीं मिला। पेज रीलोड करके फिर से कोशिश कीजिए।"),
  saveFailed: t3("Could not save right now. Check your connection and try again.", "Abhi save nahi ho paya. Internet check karke dobara try kijiye.", "अभी सेव नहीं हो पाया। इंटरनेट देखकर फिर से कोशिश कीजिए।"),
};
export const limitMsg = (n: number) => t3(`You have used all ${n} attempts for this exam.`, `Is exam ke saare ${n} attempts ho chuke hain.`, `इस एग्ज़ाम के सभी ${n} अटेम्प्ट हो चुके हैं।`);

type Admin = ReturnType<typeof createAdminClient>;
export type ExamRow = { id: string; time_limit_min: number; attempts_allowed: number; total_marks: number; pass_marks: number; distinction_marks: number };
export type Ctx = { v: Viewer; lang: Lang; meta: ExamMeta; row: ExamRow; admin: Admin };

/** Viewer (active) + the exam's DB row. Levels/weeks/exams are read with the service role so a missing RLS grant can't strand the runner. */
export async function examCtx(key: string): Promise<Ctx | { error: L; lang: Lang }> {
  if (!supabaseConfigured()) return { error: MSG.preview, lang: await getLang() };
  const v = await getViewer(); const lang = await getLang(v?.lang);
  if (!v) return { error: MSG.signIn, lang };
  if (v.status !== "active") return { error: MSG.inactive, lang };
  const meta = getExam(key); if (!meta) return { error: MSG.notFound, lang };
  let admin: Admin; try { admin = createAdminClient(); } catch { return { error: MSG.notReady, lang }; } // no service key on this host: say "not open", don't crash the page
  const { data: lvl } = await admin.from("levels").select("id").eq("slug", meta.level).maybeSingle(); if (!lvl) return { error: MSG.notReady, lang };
  let week: string | null = null;
  if (meta.week) { const { data: w } = await admin.from("weeks").select("id").eq("level_id", lvl.id).eq("number", meta.week).maybeSingle(); if (!w) return { error: MSG.notReady, lang }; week = w.id as string; }
  const q = admin.from("exams").select("id,time_limit_min,attempts_allowed,total_marks,pass_marks,distinction_marks").eq("level_id", lvl.id);
  const { data: row } = await (week ? q.eq("week_id", week) : q.is("week_id", null)).maybeSingle(); if (!row) return { error: MSG.notReady, lang };
  return { v, lang, meta, row: row as ExamRow, admin };
}

/** This learner's attempts at this exam, oldest first (insert order decides which of two racing attempts survives). */
export async function listAttempts(c: Ctx): Promise<ExamAttempt[]> {
  const { data } = await c.admin.from("attempts").select(COLS).eq("user_id", c.v.id).eq("exam_id", c.row.id).order("created_at", { ascending: true }).order("id", { ascending: true });
  return (data ?? []).map((a) => ({ ...a, answers: (a.answers ?? {}) as Answers, score: a.score == null ? null : Number(a.score), max_score: a.max_score == null ? null : Number(a.max_score) })) as ExamAttempt[];
}

/** The earlier of the stored deadline and start + time limit: an edited deadline_at can only shorten an attempt, never extend it. */
export const deadlineOf = (a: ExamAttempt, row: ExamRow) => Math.min(a.deadline_at ? Date.parse(a.deadline_at) : Infinity, Date.parse(a.started_at) + row.time_limit_min * 60_000);
export const expired = (a: ExamAttempt, row: ExamRow, now = Date.now()) => now > deadlineOf(a, row) + GRACE_MS;
export const bandOf = (a: ExamAttempt, row: ExamRow): Band => examBand(a.score ?? 0, a.max_score ?? row.total_marks, row);

/** The paper in the learner's language. Only handed out with a running attempt, so nobody can read it (page source included) before the clock starts. */
export const questionsFor = (key: string, lang: Lang): ExamQuestion[] => examPublic(key).map((q) => ({ idx: q.idx, stem: pick3(q, "stem", lang), options: q.options.map((o) => optionText(o, lang)) }));

/** Keep only answers to real questions with a real option index. */
export function cleanAnswers(raw: unknown, key: string): Answers {
  const out: Answers = {};
  if (!raw || typeof raw !== "object") return out;
  for (const q of examPublic(key)) { const v = Number((raw as Record<string, unknown>)[q.idx]); if (Number.isInteger(v) && v >= 0 && v < q.options.length) out[q.idx] = v; }
  return out;
}

/** Grade and close one open attempt. `sent` = answers from the submit button; null (or a late submit) grades the autosaved answers instead.
 *  Conditional update (submitted_at is null) so two tabs or a submit racing the auto-close can't grade twice. */
export async function closeAttempt(c: Ctx, key: string, a: ExamAttempt, sent: unknown | null): Promise<ExamResult> {
  const x = (l: L) => tr(l, c.lang), keyRows = examAnswerKey(key);
  if (!keyRows.length) return { error: x(MSG.notReady) };
  const now = Date.now(), late = expired(a, c.row, now);
  const answers = cleanAnswers(late || sent == null ? a.answers : sent, key);
  // Attempt number = submitted attempts before this one + 1. Counted, not read from the row, so the retake cap and the limit hold even for a forged row.
  const prev = (await listAttempts(c)).filter((t) => t.submitted_at && t.id !== a.id), before = prev.length;
  if (prev.some((t) => bandOf(t, c.row) !== "fail")) return { error: x(MSG.passed) }; // a pass closes the exam (its answers were shown)
  if (before >= c.row.attempts_allowed) return { error: x(limitMsg(c.row.attempts_allowed)) };
  const attemptNo = before + 1;
  let score = 0; const max = keyRows.reduce((s, q) => s + q.marks, 0);
  const full: QResult[] = keyRows.map((q, idx) => { const chosen = answers[idx] ?? -1, right = chosen === q.correct_index; if (right) score += q.marks; return { idx, chosen, right, correct: q.correct_index, explanation: pick3(q, "explanation", c.lang) }; });
  const band = examBand(score, max, c.row), passed = band !== "fail";
  const { data: done, error } = await c.admin.from("attempts").update({ answers, score, max_score: max, passed, attempt_no: attemptNo, submitted_at: new Date(now).toISOString() }).eq("id", a.id).eq("user_id", c.v.id).eq("exam_id", c.row.id).is("submitted_at", null).select("id");
  if (error) return { error: x(MSG.saveFailed) };
  if (!done?.length) return { error: x(MSG.already) };
  await awardExam(c.v.id, c.meta.level, c.row.id, a.id, score, max, attemptNo, c.meta.week === null, !late, examTitle(c.meta, "en"));
  const attemptsLeft = passed ? 0 : Math.max(0, c.row.attempts_allowed - attemptNo);
  // Correct answers only once they can no longer help a retake: after a pass (which closes the exam) or after the last attempt.
  const reveal = passed || attemptsLeft === 0;
  return { score, max, band, late, attemptNo, attemptsLeft, reveal, results: reveal ? full : full.map(({ idx, chosen, right }) => ({ idx, chosen, right })) };
}

/** Grade every open attempt whose time is over (the learner closed the tab). Returns the last one closed, for the intro screen. */
export async function closeExpired(c: Ctx, key: string): Promise<ExamResult | null> {
  let last: ExamResult | null = null;
  for (const a of (await listAttempts(c)).filter((t) => !t.submitted_at && expired(t, c.row))) { const r = await closeAttempt(c, key, a, null); if (!r.error) last = r; }
  return last;
}

export type ExamIntro =
  | { state: "demo" | "error"; msg: string }
  | { state: "ready"; row: ExamRow; used: number; passed: boolean; best: { score: number; max: number; band: Band } | null; open: (ExamAttempt & { now: number }) | null; closed: ExamResult | null };

/** What the exam page shows before anything starts. Opening the page never creates an attempt; it only finishes one whose time already ran out. */
export async function loadExamIntro(key: string): Promise<ExamIntro> {
  const c = await examCtx(key);
  if ("error" in c) return { state: supabaseConfigured() ? "error" : "demo", msg: tr(c.error, c.lang) };
  const closed = await closeExpired(c, key);
  const all = await listAttempts(c), sub = all.filter((a) => a.submitted_at);
  const best = sub.map((a) => ({ score: a.score ?? 0, max: a.max_score ?? c.row.total_marks, band: bandOf(a, c.row) })).sort((p, q) => q.score / q.max - p.score / p.max)[0] ?? null;
  const open = all.find((a) => !a.submitted_at) ?? null, passed = sub.some((a) => bandOf(a, c.row) !== "fail");
  return { state: "ready", row: c.row, used: sub.length, passed, best, open: open && !passed && sub.length < c.row.attempts_allowed ? { ...open, now: Date.now() } : null, closed };
}

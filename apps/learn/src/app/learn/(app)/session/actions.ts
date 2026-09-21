"use server";
import { revalidatePath, refresh } from "next/cache";
import { getViewer, createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/supabase/env";
import { SESSIONS, isWeekReviewDay, youtubeEmbed, type Session } from "@/lib/content/course";
import { sessionHasHandout } from "@/lib/content/resources";
import { liveSession, liveQuizKey } from "@/lib/content/live";
import { loadLearnerState } from "@/lib/progress/load";
import { gate } from "@/lib/progress/gating";
import { awardQuiz, awardAttendance, awardDiscipline } from "@/lib/scoring/award";
import { getLang } from "@/lib/i18n/server";
import { t3, tr, type L } from "@/lib/i18n/lang";
import { grade, type Graded } from "@/components/lesson/grade";

export type ActState = { error?: string; ok?: string };
export type QuizResult = { error?: string } & Partial<Graded>;
type Kind = "reflection" | "galti_log" | "friday_review";

/* What the learner reads when a save does not go through. Raw database errors are logged, never shown. */
const E = {
  preview: t3("Preview mode: progress is not saved here.", "Preview mode: yahan progress save nahi hoti.", "प्रीव्यू मोड: यहाँ प्रोग्रेस सेव नहीं होती।"),
  signIn: t3("Please sign in again to save your progress.", "Progress save karne ke liye dobara sign in kijiye.", "प्रोग्रेस सेव करने के लिए दोबारा साइन इन कीजिए।"),
  notFound: t3("This session was not found.", "Ye session nahi mila.", "यह सेशन नहीं मिला।"),
  locked: t3("This session is still locked. Finish the previous session first.", "Ye session abhi band hai. Pehle pichhla session poora kijiye.", "यह सेशन अभी बंद है। पहले पिछला सेशन पूरा कीजिए।"),
  notReady: t3("This session is not set up yet. Please tell your mentor.", "Ye session abhi set up nahi hua hai. Apne mentor ko bataiye.", "यह सेशन अभी सेट अप नहीं हुआ है। अपने मेंटर को बताइए।"),
  failed: t3("Could not save. Check your internet and try again.", "Save nahi ho paaya. Internet check karke dobara try kijiye.", "सेव नहीं हो पाया। इंटरनेट देखकर दोबारा कोशिश कीजिए।"),
  noVideo: t3("This session has no class video.", "Is session ka class video nahi hai.", "इस सेशन का क्लास वीडियो नहीं है।"),
  noHandout: t3("This session has no handout yet.", "Is session ka handout abhi nahi aaya hai.", "इस सेशन का हैंडआउट अभी नहीं आया है।"),
  noQuiz: t3("The quiz for this session is not ready yet.", "Is session ka quiz abhi taiyaar nahi hai.", "इस सेशन का क्विज़ अभी तैयार नहीं है।"),
  quizDone: t3("You have already submitted this quiz. It has one attempt.", "Ye quiz aap submit kar chuke hain. Isme ek hi attempt hota hai.", "यह क्विज़ आप सबमिट कर चुके हैं। इसमें एक ही अटेम्प्ट होता है।"),
  quizBusy: t3("Your answers are already being checked.", "Aapke answers check ho rahe hain, ek second.", "आपके जवाब चेक हो रहे हैं, एक पल रुकिए।"),
  tooShort: t3("Write at least 10 characters.", "Kam se kam 10 characters likhiye.", "कम से कम 10 अक्षर लिखिए।"),
  tooLong: t3("Keep it under 4,000 characters.", "4,000 characters se kam rakhiye.", "4,000 अक्षरों से कम रखिए।"),
  reviewDone: t3("This week's review is already saved. Choose Reflection for another note.", "Is hafte ka review save ho chuka hai. Aur note ke liye Reflection chuniye.", "इस हफ़्ते का साप्ताहिक रिव्यू सेव हो चुका है। और नोट के लिए रिफ़्लेक्शन चुनिए।"),
  journalSaved: t3("Journal saved.", "Journal save ho gaya.", "जर्नल सेव हो गया।"),
} satisfies Record<string, L>;

/* Learner+session pairs being graded right now. A double click or a second tab cannot insert a second
   attempt while the first is in flight (one Node process on the VPS); the DB check below covers the rest. */
const grading = new Set<string>();

/** The session has a handout a student can open (attendance asks for it only then). Same rows the session page shows. */
const hasHandout = (s: Session) => sessionHasHandout(s);

/** Everything a write needs, after the checks every write shares: configured, a valid session number,
 *  an active learner, and the session UNLOCKED for this learner (a replayed request cannot skip ahead). */
async function ctx(n: unknown) {
  let lang = await getLang();
  const fail = (k: keyof typeof E) => ({ error: tr(E[k], lang) }) as const;
  if (!supabaseConfigured()) return fail("preview");
  if (typeof n !== "number" || !SESSIONS.some((x) => x.number === n)) return fail("notFound");
  const v = await getViewer();
  if (!v || v.status !== "active") return fail("signIn");
  lang = await getLang(v.lang);
  const s = await liveSession(n);
  if (!s) return fail("notFound");
  const { state } = await loadLearnerState();
  if (gate(state, s).status === "locked") return fail("locked");
  const sb = await createClient();
  const { data: row } = await sb.from("sessions").select("id").eq("number", n).maybeSingle();
  if (!row) return fail("notReady");
  return { v, sb, s, n, sessionId: row.id as string, lang, fail } as const;
}
type Ctx = Extract<Awaited<ReturnType<typeof ctx>>, { sb: unknown }>;

function oops(c: Ctx, where: string, e: { message: string }) {
  console.error(`[session ${c.n}] ${where}:`, e.message);
  return c.fail("failed");
}
/** Points, completion and certificate checks run after the learner's own write has landed; if one of them
 *  fails the write still stands, so log it instead of showing an error for something that did save. */
async function after(c: Ctx, fn: () => Promise<unknown>) {
  try { await fn(); } catch (e) { console.error(`[session ${c.n}] follow-up failed:`, (e as Error).message); }
}
function done() {
  revalidatePath("/learn/path"); revalidatePath("/learn/home"); revalidatePath("/learn/score");
  refresh(); // re-render this lesson with the saved state (checks, review, next button)
}

/** Mark the session started without ever moving a finished one back to in_progress: the certificate
 *  counts status = 'complete', so a late "watched" or "handout" click must not undo it. */
async function touch(c: Ctx, patch: { watched_pct?: number; handout_opened?: boolean } = {}) {
  const { data: cur } = await c.sb.from("session_progress").select("status,watched_pct").eq("user_id", c.v.id).eq("session_id", c.sessionId).maybeSingle();
  const row: Record<string, unknown> = { user_id: c.v.id, session_id: c.sessionId, ...patch };
  if (patch.watched_pct != null) row.watched_pct = Math.max(patch.watched_pct, Number(cur?.watched_pct ?? 0)); // never lower it
  if (!cur || cur.status === "not_started") row.status = "in_progress";
  return c.sb.from("session_progress").upsert(row, { onConflict: "user_id,session_id" });
}

export async function markWatched(n: number, pct: number): Promise<ActState> {
  const c = await ctx(n); if ("error" in c) return c;
  if (!youtubeEmbed(c.s.video_url)) return c.fail("noVideo");
  if (typeof pct !== "number" || !Number.isFinite(pct)) return c.fail("failed");
  const { error } = await touch(c, { watched_pct: Math.max(0, Math.min(100, Math.round(pct))) });
  if (error) return oops(c, "watched", error);
  await after(c, () => maybeAttendance(c.v.id, c.s, c.sessionId));
  done();
  return { ok: "saved" };
}

export async function markHandoutOpened(n: number): Promise<ActState> {
  const c = await ctx(n); if ("error" in c) return c;
  if (!hasHandout(c.s)) return c.fail("noHandout");
  const { error } = await touch(c, { handout_opened: true });
  if (error) return oops(c, "handout", error);
  await after(c, () => maybeAttendance(c.v.id, c.s, c.sessionId));
  done();
  return { ok: "saved" };
}

/** Keep only well-formed answers: question position in range, option index 0-5 (the DB allows 2-6 options). */
function cleanAnswers(raw: unknown, count: number): Record<number, number> {
  const out: Record<number, number> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw)) {
    const i = Number(k), o = Number(v);
    if (Number.isInteger(i) && i >= 0 && i < count && Number.isInteger(o) && o >= 0 && o < 6) out[i] = o;
  }
  return out;
}

/** Grades server-side against the answer key; the browser never sees correct_index before this returns.
 *  One attempt per session (§12 QuizBlock: one-shot). */
export async function submitQuiz(n: number, answers: Record<number, number>): Promise<QuizResult> {
  const c = await ctx(n); if ("error" in c) return c;
  const key = await liveQuizKey(n);
  if (!key.length) return c.fail("noQuiz");
  const lock = `${c.v.id}:${c.sessionId}`;
  if (grading.has(lock)) return c.fail("quizBusy");
  grading.add(lock);
  try {
    // limit(1), not maybeSingle(): with two rows maybeSingle() errors with data = null and the check would pass.
    const { data: prior, error: pe } = await c.sb.from("attempts").select("id").eq("user_id", c.v.id).eq("session_id", c.sessionId).not("submitted_at", "is", null).limit(1);
    if (pe) return oops(c, "quiz check", pe);
    if (prior?.length) { refresh(); return c.fail("quizDone"); } // the refresh brings in their recorded review
    const clean = cleanAnswers(answers, key.length);
    const g = grade(key, clean);
    // Written with the service role: the client-side guard trigger would null the score.
    const admin = createAdminClient();
    const { error } = await admin.from("attempts").insert({ user_id: c.v.id, session_id: c.sessionId, answers: clean, score: g.score, max_score: g.max, passed: g.max > 0 && g.score / g.max >= 0.5, submitted_at: new Date().toISOString(), attempt_no: 1 });
    if (error) {
      if (error.code === "23505") { refresh(); return c.fail("quizDone"); } // a unique index, once added, lands here
      return oops(c, "quiz insert", error);
    }
    await after(c, async () => {
      await touch(c);
      await awardQuiz(c.v.id, c.s.level, c.sessionId, g.score, g.max);
      await maybeComplete(c.v.id, c.s, c.sessionId);
    });
    done();
    return g;
  } finally {
    grading.delete(lock);
  }
}

export async function saveJournal(n: number, body: string, kind: string): Promise<ActState> {
  const c = await ctx(n); if ("error" in c) return c;
  const text = typeof body === "string" ? body.trim() : "";
  if (text.length < 10) return c.fail("tooShort");
  if (text.length > 4000) return c.fail("tooLong");
  // A weekly review belongs to the week's review day, once: the certificate counts review entries.
  const k: Kind = kind === "galti_log" ? "galti_log" : kind === "friday_review" && isWeekReviewDay(c.s) ? "friday_review" : "reflection";
  if (k === "friday_review") {
    const { data: had } = await c.sb.from("journal_entries").select("id").eq("user_id", c.v.id).eq("session_id", c.sessionId).eq("kind", "friday_review").limit(1);
    if (had?.length) return c.fail("reviewDone");
  }
  // The weekly review is written with the service role: the database refuses one from the learner's own session
  // (0011 guard_journal), so the checks above cannot be skipped by posting to PostgREST directly.
  const row = { user_id: c.v.id, session_id: c.sessionId, kind: k, body: text };
  const { error } = k === "friday_review" ? await createAdminClient().from("journal_entries").insert(row) : await c.sb.from("journal_entries").insert(row);
  if (error) {
    if (error.code === "23505") { refresh(); return c.fail("reviewDone"); } // journal_one_review: a second tab saved it first
    return oops(c, "journal", error);
  }
  await after(c, async () => {
    if (k === "galti_log") await awardDiscipline(c.v.id, c.s.level, "galti_log", c.sessionId, `galti-log, session ${n}`);
    if (k === "friday_review") await awardDiscipline(c.v.id, c.s.level, "friday_on_time", c.sessionId, `week ${c.s.week} review`);
    await touch(c);
    await maybeComplete(c.v.id, c.s, c.sessionId);
  });
  done();
  return { ok: tr(E.journalSaved, c.lang) };
}

/** Flip session_progress to complete once a submitted quiz and a journal entry both exist. Service role so the
 *  row can be finalised regardless of client state. Completion can be the last certificate rule to fall, so the
 *  first flip also asks for the certificate. */
async function maybeComplete(userId: string, s: Session, sessionId: string) {
  const admin = createAdminClient();
  const [{ count: q }, { count: j }, { data: cur }] = await Promise.all([
    admin.from("attempts").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("session_id", sessionId).not("submitted_at", "is", null),
    admin.from("journal_entries").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("session_id", sessionId),
    admin.from("session_progress").select("status").eq("user_id", userId).eq("session_id", sessionId).maybeSingle(),
  ]);
  if (!q || !j) return;
  if (cur?.status !== "complete") {
    await admin.from("session_progress").upsert({ user_id: userId, session_id: sessionId, status: "complete", completed_at: new Date().toISOString() }, { onConflict: "user_id,session_id" });
    try { const { maybeIssue } = await import("@/lib/cert/issue"); await maybeIssue(userId, s.level); }
    catch (e) { console.error("[cert] issue check failed:", (e as Error).message); }
  }
  await maybeAttendance(userId, s, sessionId);
}

/** Attendance points (§9), idempotent per session via award()'s ref. With a class video: 80%+ watched.
 *  Without one (all of Tier 1 today) the lesson itself is the class, so: the session finished.
 *  Either way the session's handout (its week's, or one pinned to its day) must have been opened when there is one. */
async function maybeAttendance(userId: string, s: Session, sessionId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("session_progress").select("watched_pct,handout_opened,status").eq("user_id", userId).eq("session_id", sessionId).maybeSingle();
  if (!data) return;
  const attended = youtubeEmbed(s.video_url) ? data.watched_pct >= 80 : data.status === "complete";
  if (attended && (data.handout_opened || !hasHandout(s))) await awardAttendance(userId, s.level, sessionId);
}

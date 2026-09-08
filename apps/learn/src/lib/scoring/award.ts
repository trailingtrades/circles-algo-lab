import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { quizPoints, examPoints, practicePoints, DISCIPLINE, PER_SESSION, type GRADE_FRACTION } from "./rules";

/** All awarding goes through the service role and app.award() — idempotent per (user, kind, ref). Never called from the client. */
async function levelIdOf(admin: ReturnType<typeof createAdminClient>, slug: string) {
  const { data } = await admin.from("levels").select("id").eq("slug", slug).single(); return data!.id as string;
}
export async function awardQuiz(userId: string, levelSlug: string, sessionRowId: string, score: number, max: number) {
  const admin = createAdminClient();
  await admin.rpc("award", { p_user: userId, p_level: await levelIdOf(admin, levelSlug), p_kind: "quiz", p_points: quizPoints(score, max), p_ref_type: "session_quiz", p_ref_id: sessionRowId, p_notes: `quiz ${score}/${max}` });
}
export async function awardAttendance(userId: string, levelSlug: string, sessionRowId: string) {
  const admin = createAdminClient();
  await admin.rpc("award", { p_user: userId, p_level: await levelIdOf(admin, levelSlug), p_kind: "attendance", p_points: PER_SESSION.attendance, p_ref_type: "session_complete", p_ref_id: sessionRowId, p_notes: "video 80%+ and handout opened" });
}
/** Best attempt counts: award the delta over what this exam has already earned, so the sum equals the best attempt's points. */
export async function awardExam(userId: string, levelSlug: string, examRowId: string, attemptRowId: string, score: number, max: number, attemptNo: number, isFinal: boolean, onTime: boolean) {
  const admin = createAdminClient(); const level = await levelIdOf(admin, levelSlug);
  const pts = examPoints(score, max, attemptNo, isFinal);
  const { data: prior } = await admin.from("score_events").select("points").eq("user_id", userId).eq("kind", "exam").eq("notes", `exam:${examRowId}`);
  const earned = (prior ?? []).reduce((a, e) => a + Number(e.points), 0);
  const delta = Math.round((pts - earned) * 100) / 100;
  if (delta > 0) await admin.rpc("award", { p_user: userId, p_level: level, p_kind: "exam", p_points: delta, p_ref_type: "attempt", p_ref_id: attemptRowId, p_notes: `exam:${examRowId}` });
  if (onTime) await admin.rpc("award", { p_user: userId, p_level: level, p_kind: "discipline", p_points: DISCIPLINE.exam_on_time, p_ref_type: "exam_on_time", p_ref_id: examRowId, p_notes: "exam submitted within the time limit" });
}
export async function awardPractice(userId: string, levelSlug: string, artefact: string, refId: string, grade: keyof typeof GRADE_FRACTION, artefactPoints: number, gradeRowId: string) {
  const admin = createAdminClient();
  await admin.rpc("award", { p_user: userId, p_level: await levelIdOf(admin, levelSlug), p_kind: "practice", p_points: practicePoints(grade, artefactPoints), p_ref_type: `practice_${artefact}`, p_ref_id: gradeRowId, p_notes: `process grade ${grade}` });
}
export async function awardDiscipline(userId: string, levelSlug: string, refType: "friday_on_time" | "galti_log" | "journal_streak_week", refId: string, notes: string) {
  const admin = createAdminClient();
  await admin.rpc("award", { p_user: userId, p_level: await levelIdOf(admin, levelSlug), p_kind: "discipline", p_points: DISCIPLINE[refType], p_ref_type: refType, p_ref_id: refId, p_notes: notes });
}

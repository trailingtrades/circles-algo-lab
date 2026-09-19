import "server-only";
import { createClient, getViewer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { computeScore, nextActions, type NextAction } from "./rules";
import { currentLevel, dueExam, dueReview, examTitle, examTitles } from "./next";
import { EXAMS, RESOURCES, examKey, SESSIONS, levelOf, pick3, youtubeEmbed, type ExamMeta, type LevelSlug, type Session } from "@/lib/content/course";
import type { EventRow } from "@/components/ui/ScoreBreakdown";
import { loadLearnerState } from "@/lib/progress/load";
import { nextSession, stateOf, isComplete, type LearnerState } from "@/lib/progress/gating";
import { t3, tr, type Lang } from "@/lib/i18n/lang";

export interface ScoreView { level: LevelSlug; levelTitle: string; components: ReturnType<typeof computeScore>; events: EventRow[]; rank: number | null; band: string | null; actions: NextAction[]; demo: boolean; lang: Lang }

/* What each score event says on screen. Built here (server) from ref_type + ref_id so the breakdown never prints raw ids. */
const E = {
  session: t3("Session", "Session", "सेशन"),
  attended: t3("attended (lesson and handout done)", "attend kiya (lesson aur handout poore)", "हाज़िरी (पाठ और हैंडआउट पूरे)"),
  quiz: t3("quiz", "quiz", "क्विज़"),
  attempt: t3("attempt", "attempt", "अटेम्प्ट"),
  onTime: t3("submitted on time", "time par submit kiya", "समय पर सबमिट किया"),
  review: t3("Weekly review", "Weekly review", "हफ़्ते का रिव्यू"),
  galti: t3("Galti-log entry", "Galti-log entry", "गलती-लॉग एंट्री"),
  streak: t3("Journal streak: a full week", "Journal streak: poora hafta", "जर्नल स्ट्रीक: पूरा हफ़्ता"),
  practice: t3("Practice work graded", "Practice ka kaam grade hua", "प्रैक्टिस के काम की ग्रेडिंग"),
  grade: t3("grade", "grade", "ग्रेड"),
  exam: t3("Exam", "Exam", "एग्ज़ाम"),
};
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
type Raw = EventRow & { ref_id?: string | null };
type Lookups = { sessNo: Map<string, number>; examById: Map<string, ExamMeta>; attemptExam: Map<string, { exam: string; no: number }> };

function labelOf(e: Raw, lang: Lang, k: Lookups): string {
  const x = (l: { en: string; hi: string; dv: string }) => tr(l, lang), sess = (id?: string | null) => (id && k.sessNo.get(id)) || null;
  const frac = (e.notes ?? "").match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/)?.[0]?.replace(/\s/g, "");
  switch (e.ref_type) {
    case "session_complete": { const n = sess(e.ref_id); return n ? `${x(E.session)} ${n}: ${x(E.attended)}` : x(E.attended); }
    case "session_quiz": { const n = sess(e.ref_id); return [n ? `${x(E.session)} ${n} ${x(E.quiz)}` : x(E.quiz), frac].filter(Boolean).join(" · "); }
    case "attempt": { const a = e.ref_id ? k.attemptExam.get(e.ref_id) : undefined; const m = a ? k.examById.get(a.exam) : undefined; return [m ? examTitle(m, lang) : x(E.exam), frac, a ? `${x(E.attempt)} ${a.no}` : null].filter(Boolean).join(" · "); }
    case "exam_on_time": { const m = e.ref_id ? k.examById.get(e.ref_id) : undefined; return `${m ? examTitle(m, lang) : x(E.exam)}: ${x(E.onTime)}`; }
    case "friday_on_time": { const n = sess(e.ref_id); return n ? `${x(E.review)} · ${x(E.session)} ${n}` : x(E.review); }
    case "galti_log": { const n = sess(e.ref_id); return n ? `${x(E.galti)} · ${x(E.session)} ${n}` : x(E.galti); }
    case "journal_streak_week": return x(E.streak);
  }
  // The grade is the note's last token: "process grade B" (first grade) or "regrade <grade id>: C to A" (the new grade).
  if (e.ref_type?.startsWith("practice_")) { const g = (e.notes ?? "").match(/(?:\bprocess grade|\bto)\s+([A-F])\s*$/i)?.[1]; return g ? `${x(E.practice)} · ${x(E.grade)} ${g.toUpperCase()}` : x(E.practice); }
  // Overrides keep the reason the mentor typed; anything unknown loses its ids rather than showing them.
  return (e.notes ?? "").replace(UUID, "").replace(/\s{2,}/g, " ").trim() || e.kind;
}

/** What the client gets: the label, not the ref id. */
const view = ({ ref_id, ...e }: Raw, lang: Lang, k: Lookups): EventRow => ({ ...e, label: labelOf({ ...e, ref_id }, lang, k) });

/** Actions for this learner at this level: the exam and weekly review that are actually due, not a fixed list. */
function actionsFor(state: LearnerState, level: LevelSlug, components: ReturnType<typeof computeScore>, doneExams: Set<string>, reviewed: Set<number>, portfolioRowsComplete: number) {
  const open = nextSession(state);
  // Same rule as maybeAttendance in session/actions.ts: 80% of the class video only where there is one
  // (Tier 1 has none: finishing the session is the class), and the handout only when the week has one.
  const hasHandout = (s: Session) => RESOURCES.some((r) => r.level === s.level && r.week === s.week && r.kind === "handout" && !!r.storage_path?.startsWith("http"));
  const missingAtt = SESSIONS.filter((s) => {
    const st = stateOf(state, s.number);
    return s.level === level && isComplete(st) && ((!!youtubeEmbed(s.video_url) && st.watched_pct < 80) || (hasHandout(s) && !st.handout_opened));
  }).map((s) => s.number);
  const ex = dueExam(state, level, doneExams), rv = dueReview(state, level, reviewed);
  return nextActions({ components, openSession: open && open.level === level ? open.number : null, sessionsMissingAttendance: missingAtt, pendingExam: ex ? { key: examKey(ex), title: examTitles(ex), isFinal: ex.week === null } : null, fridayDue: !!rv, fridayHref: rv ? `/learn/session/${rv.session}` : undefined, fridayWeek: rv?.week ?? null, portfolioRowsComplete, level });
}

export async function loadScore(): Promise<ScoreView> {
  const { state, demo, lang } = await loadLearnerState();
  const level = currentLevel(state);
  const base = { level, levelTitle: pick3(levelOf(level), "title", lang), demo, lang } as const;
  const empty = { ...base, components: computeScore([]), events: [] as EventRow[], rank: null, band: null, actions: [] as NextAction[] };
  if (demo || !supabaseConfigured()) {
    const raw: Raw[] = [{ id: "d1", kind: "attendance", points: 10, notes: null, awarded_at: "2026-10-01", ref_type: "session_complete", ref_id: "s1" }, { id: "d2", kind: "quiz", points: 10, notes: "quiz 3/3", awarded_at: "2026-10-01", ref_type: "session_quiz", ref_id: "s1" }, { id: "d3", kind: "attendance", points: 10, notes: null, awarded_at: "2026-10-02", ref_type: "session_complete", ref_id: "s2" }, { id: "d4", kind: "quiz", points: 6.67, notes: "quiz 2/3", awarded_at: "2026-10-02", ref_type: "session_quiz", ref_id: "s2" }];
    const k: Lookups = { sessNo: new Map([["s1", 1], ["s2", 2]]), examById: new Map(), attemptExam: new Map() };
    const events = raw.map((e) => view(e, lang, k));
    const components = computeScore(events.map((e) => ({ kind: e.kind as "quiz", points: e.points })));
    return { ...base, components, events, rank: null, band: "Top 25%", actions: actionsFor(state, level, components, new Set(), new Set(), 0) };
  }
  const v = await getViewer(); if (!v) return empty;
  const sb = await createClient();
  // levels_read needs an active account: a suspended learner gets an empty page instead of a crash.
  const { data: lv } = await sb.from("levels").select("id").eq("slug", level).maybeSingle(); if (!lv) return empty;
  const [{ data: ev }, { data: board }, { data: rows }, { data: attempts }, { data: exams }, { data: sess }, { data: reviews }] = await Promise.all([
    sb.from("score_events").select("id,kind,points,notes,awarded_at,ref_type,ref_id").eq("user_id", v.id).eq("level_id", lv.id).order("awarded_at", { ascending: false }),
    sb.rpc("board_process", { p_level: lv.id }),
    sb.from("portfolio_rows").select("full_why,full_why_2,top_risk,risk_answer,price_stop,why_stop,review_point").eq("user_id", v.id),
    sb.from("attempts").select("id,exam_id,attempt_no,submitted_at").eq("user_id", v.id).not("exam_id", "is", null),
    sb.from("exams").select("id,week_id,weeks(number)").eq("level_id", lv.id),
    sb.from("sessions").select("id,number"),
    sb.from("journal_entries").select("session_id").eq("user_id", v.id).eq("kind", "friday_review").not("session_id", "is", null),
  ]);
  // exam row id -> content exam (by level + week number), so ids never reach the screen and "done" is per exam, not per week slot.
  const examById = new Map<string, ExamMeta>();
  for (const x of exams ?? []) { const wk = (x.weeks as unknown as { number: number } | null)?.number ?? null; const m = EXAMS.find((e) => e.level === level && e.week === (x.week_id ? wk : null)); if (m) examById.set(x.id as string, m); }
  const sessNo = new Map((sess ?? []).map((s) => [s.id as string, s.number as number]));
  const attemptExam = new Map((attempts ?? []).map((a) => [a.id as string, { exam: a.exam_id as string, no: a.attempt_no as number }]));
  const doneExams = new Set((attempts ?? []).filter((a) => a.submitted_at).map((a) => examById.get(a.exam_id as string)).filter((m): m is ExamMeta => !!m).map(examKey));
  const reviewed = new Set((reviews ?? []).map((r) => sessNo.get(r.session_id as string)).filter((n): n is number => !!n));
  const events = ((ev ?? []) as Raw[]).map((e) => view(e, lang, { sessNo, examById, attemptExam }));
  const components = computeScore(events.map((e) => ({ kind: e.kind as "quiz", points: Number(e.points) })));
  const me = (board ?? []).find((r: { is_me: boolean }) => r.is_me) as { rank: number; band: string } | undefined;
  const complete = (rows ?? []).filter((r) => r.full_why && r.full_why_2 && r.top_risk && r.risk_answer && r.price_stop && r.why_stop && r.review_point).length;
  return { ...base, components, events, rank: me?.rank ?? null, band: me?.band ?? null, actions: actionsFor(state, level, components, doneExams, reviewed, complete) };
}

import "server-only";
import { createClient, getViewer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { computeScore, nextActions, type NextAction } from "./rules";
import { EXAMS, examKey, SESSIONS, type LevelSlug } from "@/lib/content/course";
import type { EventRow } from "@/components/ui/ScoreBreakdown";
import { loadLearnerState } from "@/lib/progress/load";
import { nextSession, stateOf, isComplete } from "@/lib/progress/gating";

export interface ScoreView { level: LevelSlug; components: ReturnType<typeof computeScore>; events: EventRow[]; rank: number | null; band: string | null; actions: NextAction[]; demo: boolean; lang: "en" | "hi" }

export async function loadScore(): Promise<ScoreView> {
  const { state, demo, lang } = await loadLearnerState();
  const open = nextSession(state);
  const level: LevelSlug = open?.level ?? "advanced";
  const missingAtt = SESSIONS.filter((s) => s.level === level && isComplete(stateOf(state, s.number)) && (stateOf(state, s.number).watched_pct < 80 || !stateOf(state, s.number).handout_opened)).map((s) => s.number);
  const base = { level, demo, lang } as const;
  if (demo || !supabaseConfigured()) {
    const events: EventRow[] = [{ id: "d1", kind: "attendance", points: 10, notes: "Session 1 complete", awarded_at: "2026-10-01", ref_type: "session_complete" }, { id: "d2", kind: "quiz", points: 10, notes: "quiz 3/3", awarded_at: "2026-10-01", ref_type: "session_quiz" }, { id: "d3", kind: "attendance", points: 10, notes: "Session 2 complete", awarded_at: "2026-10-02", ref_type: "session_complete" }, { id: "d4", kind: "quiz", points: 6.67, notes: "quiz 2/3", awarded_at: "2026-10-02", ref_type: "session_quiz" }];
    const components = computeScore(events.map((e) => ({ kind: e.kind as "quiz", points: e.points })));
    return { ...base, components, events, rank: null, band: "Top 25%", actions: nextActions({ components, openSession: open?.number ?? null, sessionsMissingAttendance: missingAtt, pendingExam: { key: "foundation-w1", title: "Foundation Week 1 exam", isFinal: false }, fridayDue: true, portfolioRowsComplete: 0, level }) };
  }
  const v = (await getViewer())!; const sb = await createClient();
  const { data: lv } = await sb.from("levels").select("id").eq("slug", level).single();
  const [{ data: ev }, { data: board }, { data: rows }, { data: attempts }] = await Promise.all([
    sb.from("score_events").select("id,kind,points,notes,awarded_at,ref_type").eq("user_id", v.id).eq("level_id", lv!.id).order("awarded_at", { ascending: false }),
    sb.rpc("board_process", { p_level: lv!.id }),
    sb.from("portfolio_rows").select("full_why,full_why_2,top_risk,risk_answer,price_stop,why_stop,review_point").eq("user_id", v.id),
    sb.from("attempts").select("exam_id,submitted_at,exams(week_id,level_id)").eq("user_id", v.id).not("exam_id", "is", null).not("submitted_at", "is", null),
  ]);
  const events = (ev ?? []) as EventRow[];
  const components = computeScore(events.map((e) => ({ kind: e.kind as "quiz", points: Number(e.points) })));
  const me = (board ?? []).find((r: { is_me: boolean }) => r.is_me) as { rank: number; band: string } | undefined;
  const complete = (rows ?? []).filter((r) => r.full_why && r.full_why_2 && r.top_risk && r.risk_answer && r.price_stop && r.why_stop && r.review_point).length;
  const doneExamWeeks = new Set((attempts ?? []).map((a) => (a.exams as unknown as { week_id: string | null } | null)?.week_id ?? "final"));
  const pending = EXAMS.filter((e) => e.level === level).find((e) => !doneExamWeeks.has(e.week ? "w" : "final") ) ?? null; // simplified: first exam not yet attempted
  const actions = nextActions({ components, openSession: open?.number ?? null, sessionsMissingAttendance: missingAtt, pendingExam: pending ? { key: examKey(pending), title: pending.title, isFinal: pending.week === null } : null, fridayDue: true, portfolioRowsComplete: complete, level });
  return { ...base, components, events, rank: me?.rank ?? null, band: me?.band ?? null, actions };
}

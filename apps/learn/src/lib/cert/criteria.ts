/** Certificate issue criteria (§11) — pure evaluation over already-loaded facts. */
export interface CriteriaInput { sessionsTotal: number; sessionsComplete: number; finalPct: number | null; weeklyAttempted: number; weeklyTotal: number; artefactsGraded: { grade: string }[]; artefactsRequired: number; fridayReviews: number; suspended: boolean }
export interface Criterion { key: string; label: string; labelHi: string; ok: boolean; detail: string; href: string }
export const PASS = 0.6, DISTINCTION = 30 / 36;
const passGrade = (g: string) => ["A", "B", "C"].includes(g);
export function evaluate(i: CriteriaInput): { ok: boolean; band: "distinction" | "pass" | null; items: Criterion[] } {
  const need = Math.ceil(i.sessionsTotal * 0.9);
  const gradedOk = i.artefactsGraded.filter((g) => passGrade(g.grade)).length;
  const items: Criterion[] = [
    { key: "sessions", label: `At least 90% of sessions complete (${need}/${i.sessionsTotal})`, labelHi: `Kam se kam 90% sessions poore (${need}/${i.sessionsTotal})`, ok: i.sessionsComplete >= need, detail: `${i.sessionsComplete}/${i.sessionsTotal}`, href: "/learn/path" },
    { key: "final", label: "Final exam passed (60% or more)", labelHi: "Final exam pass (60% ya zyada)", ok: (i.finalPct ?? 0) >= PASS, detail: i.finalPct === null ? "not attempted" : `${Math.round(i.finalPct * 100)}%`, href: "/learn/exam" },
    { key: "weekly", label: "All 3 weekly exams attempted", labelHi: "Teeno weekly exams attempt kiye", ok: i.weeklyAttempted >= i.weeklyTotal, detail: `${i.weeklyAttempted}/${i.weeklyTotal}`, href: "/learn/exam" },
    { key: "artefacts", label: `Practice artefact ladder complete, mentor-graded C or better (${i.artefactsRequired})`, labelHi: `Practice artefacts poore, mentor grade C ya better (${i.artefactsRequired})`, ok: gradedOk >= i.artefactsRequired, detail: `${gradedOk}/${i.artefactsRequired}`, href: "/learn/portfolio" },
    { key: "friday", label: "Friday reviews: at least 3 of 4 submitted", labelHi: "Friday reviews: 4 mein se kam se kam 3", ok: i.fridayReviews >= 3, detail: `${i.fridayReviews}/4`, href: "/learn/path" },
    { key: "status", label: "Account in good standing (not suspended)", labelHi: "Account active hai (suspended nahi)", ok: !i.suspended, detail: i.suspended ? "suspended" : "active", href: "/learn/profile" },
  ];
  const ok = items.every((x) => x.ok);
  return { ok, band: ok ? ((i.finalPct ?? 0) >= DISTINCTION ? "distinction" : "pass") : null, items };
}

"use client";
import { useState } from "react";
import { WEIGHTS } from "@/lib/scoring/rules";
import { ChevronDown, ChevronUp } from "./Icon";

export interface EventRow { id: string; kind: string; points: number; notes: string | null; awarded_at: string; ref_type: string | null }
const LABEL: Record<keyof typeof WEIGHTS, { en: string; hi: string }> = { attendance: { en: "Attendance & completion", hi: "Attendance & completion" }, quiz: { en: "Quiz", hi: "Quiz" }, exam: { en: "Exams", hi: "Exams" }, practice: { en: "Practice artefacts", hi: "Practice artefacts" }, discipline: { en: "Discipline", hi: "Discipline" } };

/** Five bars, each expandable to its score_events — every point traceable to the action that earned it (§9). */
export function ScoreBreakdown({ components, events, lang }: { components: Record<keyof typeof WEIGHTS, number>; events: EventRow[]; lang: "en" | "hi" }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="lrn-list">
      {(Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).map((k) => {
        const val = components[k] ?? 0; const max = WEIGHTS[k]; const rows = events.filter((e) => e.kind === k); const isOpen = open === k;
        return (
          <div key={k} className="col-card__inner lrn-bar">
            <button type="button" className="lrn-bar__head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : k)}>
              <span>{LABEL[k][lang]}</span>
              <span className="lrn-num">{val} / {max}</span>
              {isOpen ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
            </button>
            <div className="lrn-bar__track" aria-hidden><div className="lrn-bar__fill" style={{ width: `${Math.min(100, (val / max) * 100)}%` }} /></div>
            {isOpen && (
              <ul className="lrn-events">
                {rows.length === 0 && <li className="lrn-muted">{lang === "hi" ? "Abhi koi point nahi. Neeche 'next 3 actions' dekhiye." : "No points yet. See the next 3 actions below."}</li>}
                {rows.map((e) => <li key={e.id}><span className="lrn-num">{Number(e.points) >= 0 ? "+" : "−"}{Math.abs(Number(e.points))}</span> {e.notes ?? e.ref_type} <span className="lrn-muted lrn-num">{new Date(e.awarded_at).toLocaleDateString("en-IN")}</span></li>)}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

"use client";
import { useState } from "react";
import { WEIGHTS } from "@/lib/scoring/rules";
import { t3, tr, type Lang } from "@/lib/i18n/lang";
import { ChevronDown, ChevronUp } from "./Icon";

/** `label` is the line built server-side (lib/scoring/read.ts) in the learner's language; notes are only a fallback. */
export interface EventRow { id: string; kind: string; points: number; notes: string | null; awarded_at: string; ref_type: string | null; label?: string }
const S = {
  attendance: t3("Class attendance", "Class attendance", "क्लास अटेंडेंस"),
  quiz: t3("Session quizzes", "Session quiz", "सेशन क्विज़"),
  exam: t3("Exams", "Exams", "एग्ज़ाम"),
  practice: t3("Practice work", "Practice ka kaam", "प्रैक्टिस का काम"),
  discipline: t3("Discipline", "Discipline", "अनुशासन"),
  override: t3("Adjustments by your mentor", "Mentor ke adjustments", "मेंटर के एडजस्टमेंट"),
  none: t3("No points here yet. The next actions below show where to start.", "Yahan abhi koi point nahi hai. Neeche diye agle kaam se shuru kijiye.", "यहाँ अभी कोई पॉइंट नहीं है। नीचे दिए अगले काम से शुरू कीजिए।"),
};
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const line = (e: EventRow) => e.label || (e.notes ?? "").replace(UUID, "").replace(/\s{2,}/g, " ").trim() || e.kind;
// Fixed zone so the server render and the browser print the same date (no hydration mismatch across time zones).
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
const signed = (p: number) => `${p >= 0 ? "+" : "−"}${Math.abs(Math.round(p * 100) / 100)}`;

/** Five bars (plus mentor adjustments when there are any), each expandable to its score_events: every point traceable to the action that earned it (§9). */
export function ScoreBreakdown({ components, events, lang }: { components: Record<keyof typeof WEIGHTS, number> & { override?: number }; events: EventRow[]; lang: Lang }) {
  const [open, setOpen] = useState<string | null>(null);
  const keys: (keyof typeof WEIGHTS | "override")[] = [...(Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]), ...(events.some((e) => e.kind === "override") ? ["override" as const] : [])];
  return (
    <div className="lrn-list">
      {keys.map((k) => {
        const val = k === "override" ? components.override ?? 0 : components[k] ?? 0; const max = k === "override" ? null : WEIGHTS[k];
        const rows = events.filter((e) => e.kind === k); const isOpen = open === k; const panel = `sb-${k}`;
        return (
          <div key={k} className="col-card__inner lrn-bar">
            <button type="button" className="lrn-bar__head" aria-expanded={isOpen} aria-controls={panel} onClick={() => setOpen(isOpen ? null : k)}>
              <span>{tr(S[k], lang)}</span>
              <span className="lrn-num">{max === null ? signed(val) : `${val} / ${max}`}</span>
              {isOpen ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
            </button>
            {max !== null && <div className="lrn-bar__track" aria-hidden><div className="lrn-bar__fill" style={{ width: `${Math.min(100, (val / max) * 100)}%` }} /></div>}
            {isOpen && (
              <ul className="lrn-events" id={panel}>
                {rows.length === 0 && <li className="lrn-muted">{tr(S.none, lang)}</li>}
                {rows.map((e) => <li key={e.id}><span className="lrn-num">{signed(Number(e.points))}</span> {line(e)} <span className="lrn-muted lrn-num">{day(e.awarded_at)}</span></li>)}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

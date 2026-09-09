import { Lock, CheckCircle, Clock } from "./Icon";

export type SessionStatus = "complete" | "in_progress" | "locked" | "not_started";
export interface SessionCardProps { n: number; day: string; titleEn: string; titleHi: string; concept: string; aiLab: string; psychology: string; status: SessionStatus; lockedWhy?: string; lang: "en" | "hi"; }

const STATUS: Record<SessionStatus, { label: string; cls: string }> = {
  complete: { label: "Complete", cls: "col-chip--up" },
  in_progress: { label: "In progress", cls: "" },
  locked: { label: "Locked", cls: "" },
  not_started: { label: "Not started", cls: "" },
};

export function SessionCard(p: SessionCardProps) {
  const s = STATUS[p.status];
  const Glyph = p.status === "complete" ? CheckCircle : p.status === "locked" ? Lock : Clock;
  return (
    <article className="col-card lrn-session" aria-label={`Session ${p.n}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="col-eyebrow">Day {p.day} · S{String(p.n).padStart(2, "0")}</span>
        <span className={`col-chip ${s.cls}`}><Glyph size={14} strokeWidth={1.75} aria-hidden />{s.label}</span>
      </div>
      <h3 className="lrn-session__title">{p.lang === "hi" ? p.titleHi : p.titleEn}</h3>
      <p className="lrn-session__sub">{p.lang === "hi" ? p.titleEn : p.titleHi}</p>
      <div className="lrn-tags">
        <span className="col-chip">Concept: {p.concept}</span>
        <span className="col-chip">AI Lab: {p.aiLab}</span>
        <span className="col-chip">Psychology: {p.psychology}</span>
      </div>
      {p.status === "locked" && p.lockedWhy && <p className="lrn-session__sub"><Lock size={12} aria-hidden /> {p.lockedWhy}</p>}
    </article>
  );
}

import { Lock, CheckCircle, Clock } from "./Icon";
import { Cover } from "./CourseArt";

export type SessionStatus = "complete" | "in_progress" | "locked" | "not_started";
export interface SessionCardProps { n: number; day: string; titleEn: string; titleHi: string; concept: string; aiLab: string; psychology: string; status: SessionStatus; lockedWhy?: string; lang: "en" | "hi"; level?: string; week?: number; }

const STATUS: Record<SessionStatus, { label: string; cls: string }> = {
  complete: { label: "Complete", cls: "col-chip--up" },
  in_progress: { label: "In progress", cls: "" },
  locked: { label: "Locked", cls: "" },
  not_started: { label: "Not started", cls: "" },
};

export function SessionCard(p: SessionCardProps) {
  const s = STATUS[p.status];
  const locked = p.status === "locked";
  const Glyph = p.status === "complete" ? CheckCircle : locked ? Lock : Clock;
  return (
    <article className={`col-card lrn-session${locked ? " lrn-card--locked" : ""}`} aria-label={`Session ${p.n}`}>
      {p.level != null && p.week != null && <Cover level={p.level} week={p.week} />}
      <div className="flex items-center justify-between gap-2">
        <span className="col-eyebrow">{p.day} · S{String(p.n).padStart(2, "0")}</span>
        {/* Locked cards get the hollow badge + padlock chip, never a dimmed one. */}
        {locked
          ? <span className="flex items-center gap-2"><span className="lrn-badge--hollow">{s.label}</span><span className="lrn-lockchip"><Lock size={13} strokeWidth={1.75} aria-hidden /></span></span>
          : <span className={`col-chip ${s.cls}`}><Glyph size={14} strokeWidth={1.75} aria-hidden />{s.label}</span>}
      </div>
      <h3 className="lrn-session__title">{p.lang === "hi" ? p.titleHi : p.titleEn}</h3>
      <p className="lrn-session__sub">{p.lang === "hi" ? p.titleEn : p.titleHi}</p>
      <div className="lrn-tags">
        <span className="col-chip">Concept: {p.concept}</span>
        <span className="col-chip">AI Lab: {p.aiLab}</span>
        <span className="col-chip">Psychology: {p.psychology}</span>
      </div>
      {locked && p.lockedWhy && <p className="lrn-session__sub"><Lock size={12} aria-hidden /> {p.lockedWhy}</p>}
    </article>
  );
}

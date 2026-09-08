export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession, weekOf, levelOf, quizPublic, youtubeEmbed, RESOURCES } from "@/lib/content/course";
import { loadLearnerState } from "@/lib/progress/load";
import { gate, stateOf } from "@/lib/progress/gating";
import { LockedGate } from "@/components/ui/LockedGate";
import { SessionTabs } from "./SessionTabs";
import { ChevronLeft } from "@/components/ui/Icon";

export default async function SessionPage({ params }: { params: Promise<{ n: string }> }) {
  const { n: raw } = await params;
  const n = Number(raw);
  const s = Number.isInteger(n) ? getSession(n) : null;
  if (!s) notFound();
  const { state, demo, lang } = await loadLearnerState();
  const g = gate(state, s);
  const week = weekOf(s); const level = levelOf(s.level);
  const resources = RESOURCES.filter((r) => r.level === s.level && r.week === s.week && (r.kind === "deck" || r.kind === "handout"));
  return (
    <>
      <Link href="/learn/path" className="lrn-link" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--col-text-body-sm)" }}><ChevronLeft size={14} aria-hidden /> Path</Link>
      <p className="col-eyebrow mt-2">{level.title_en} · Week {week.number} · {lang === "hi" ? week.title_hi : week.title_en} · Day {s.day} · S{String(s.number).padStart(2, "0")}</p>
      <h1 className="lrn-title">{lang === "hi" ? s.title_hi : s.title_en}</h1>
      <p className="lrn-muted" style={{ marginTop: 0 }}>{lang === "hi" ? s.title_en : s.title_hi}</p>
      <div className="lrn-tags mb-4"><span className="col-chip">Concept: {s.core_concept}</span><span className="col-chip">AI Lab: {s.ai_lab}</span><span className="col-chip">Psychology: {s.psychology}</span><span className="col-chip lrn-num">{s.duration_min} min</span>{s.draft && <span className="col-chip">draft content</span>}</div>
      {g.status === "locked" ? <LockedGate gate={g} lang={lang} /> : (
        <SessionTabs s={s} embed={youtubeEmbed(s.video_url)} resources={resources} quiz={quizPublic(s.number)} state={stateOf(state, s.number)} lang={lang} demo={demo} />
      )}
    </>
  );
}

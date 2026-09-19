import { Lock, Check } from "./Icon";
import { Cover } from "./CourseArt";
import { pick3, type Session } from "@/lib/content/course";
import type { Gate, Status } from "@/lib/progress/gating";
import { t3, tr, type L, type Lang } from "@/lib/i18n/lang";
import { T } from "@/lib/i18n/strings";

export type SessionStatus = Status;

const S = {
  notStarted: t3("Not started", "Abhi shuru nahi hua", "अभी शुरू नहीं हुआ"),
  aiLab: t3("AI lab", "AI lab", "AI लैब"),
};
const STATUS: Record<Status, L> = { complete: T.done, in_progress: T.inProgress, locked: T.locked, not_started: S.notStarted };

/** "Day 8 · S08" in every language — the same label on Home, Path and the session page.
 *  Tier 1 counts course days; tiers without a course day fall back to the session number. */
export function dayText(s: Session, lang: Lang) {
  const n = `S${String(s.number).padStart(2, "0")}`;
  return s.course_day ? `${tr(T.day, lang)} ${s.course_day} · ${n}` : `${tr(T.session, lang)} ${s.number}`;
}
export const statusText = (st: Status, lang: Lang) => tr(STATUS[st], lang);

/** One session as a card: cover, status, day, the title in the learner's language only, one muted line of topics,
 *  and — when locked — why, in the learner's language (pass why={false} where the reason only repeats the card
 *  before it). The status is the only pill on the card. */
export function SessionCard({ s, g, lang, cover = true, why = true }: { s: Session; g: Gate; lang: Lang; cover?: boolean; why?: boolean }) {
  const locked = g.status === "locked";
  const concept = tr(s.content.tags?.concept ?? s.core_concept, lang);
  const lab = tr(s.content.tags?.ai_lab ?? s.ai_lab, lang);
  return (
    <article className={`col-card lrn-session${locked ? " lrn-card--locked" : ""}`}>
      {cover && <Cover level={s.level} week={s.week} n={s.number} />}
      <div className="flex items-center justify-between gap-2">
        {/* Locked = hollow badge with a padlock (recessed card, never opacity-dimmed); done = brand + check. */}
        {locked
          ? <span className="lrn-badge--hollow"><Lock size={12} strokeWidth={1.75} aria-hidden />{statusText(g.status, lang)}</span>
          : <span className="lrn-avail">{g.status === "complete" && <Check size={12} strokeWidth={2} aria-hidden style={{ marginRight: 4 }} />}{statusText(g.status, lang)}</span>}
        <span className="col-eyebrow">{dayText(s, lang)}</span>
      </div>
      <h3 className="lrn-session__title">{pick3(s, "title", lang)}</h3>
      {(concept || lab) && <p className="lrn-session__sub">{[concept, lab && `${tr(S.aiLab, lang)}: ${lab}`].filter(Boolean).join(" · ")}</p>}
      {locked && why && g.why && <p className="lrn-session__sub">{tr(g.why, lang)}</p>}
    </article>
  );
}

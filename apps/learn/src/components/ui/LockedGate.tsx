import Link from "next/link";
import { Lock, ArrowRight } from "./Icon";
import type { Gate } from "@/lib/progress/gating";
import { t3, tr, type Lang } from "@/lib/i18n/lang";
import { T } from "@/lib/i18n/strings";

const S = {
  title: t3("This is locked for now", "Ye abhi band hai", "यह अभी बंद है"),
  go: t3("Take me there", "Wahan chaliye", "वहाँ चलिए"),
};

/** Explains WHY something is locked and links to the unblocking action (§12).
    Winners locked recipe: recessed surface + padlock chip + hollow badge —
    never opacity-dimmed, every text token at full strength.
    Hookless, so server pages can render it. The reason comes from gate.why (all three languages). */
export function LockedGate({ gate, lang, title }: { gate: Gate; lang: Lang; title?: string }) {
  const reason = tr(gate.why, lang);
  return (
    <div className="col-card col-empty lrn-card--locked" role="status">
      <span className="lrn-lockchip"><Lock size={14} strokeWidth={1.75} aria-hidden /></span>
      <span className="lrn-badge--hollow">{tr(T.locked, lang)}</span>
      <p className="col-empty__title">{title ?? tr(S.title, lang)}</p>
      {reason && <p style={{ margin: 0 }}>{reason}</p>}
      {gate.unlockHref && <Link href={gate.unlockHref} className="col-btn col-btn--primary mt-3">{tr(S.go, lang)} <ArrowRight size={16} aria-hidden /></Link>}
    </div>
  );
}

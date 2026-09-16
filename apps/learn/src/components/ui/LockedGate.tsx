import Link from "next/link";
import { Lock, ArrowRight } from "./Icon";
import type { Gate } from "@/lib/progress/gating";

/** Explains WHY something is locked and links to the unblocking action (§12).
    Winners locked recipe: recessed surface + padlock chip + hollow badge —
    never opacity-dimmed, every text token at full strength. */
export function LockedGate({ gate, lang, title }: { gate: Gate; lang: "en" | "hi"; title?: string }) {
  return (
    <div className="col-card col-empty lrn-card--locked" role="status">
      <span className="lrn-lockchip"><Lock size={14} strokeWidth={1.75} aria-hidden /></span>
      <span className="lrn-badge--hollow">Locked</span>
      <p className="col-empty__title">{title ?? (lang === "hi" ? "Ye abhi locked hai" : "This is locked")}</p>
      <p style={{ margin: 0 }}>{lang === "hi" ? gate.reasonHi : gate.reason}</p>
      {gate.unlockHref && <Link href={gate.unlockHref} className="col-btn col-btn--primary mt-3">{lang === "hi" ? "Wahan le chalo" : "Take me there"} <ArrowRight size={16} aria-hidden /></Link>}
    </div>
  );
}

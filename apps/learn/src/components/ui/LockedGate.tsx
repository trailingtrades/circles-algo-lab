import Link from "next/link";
import { Lock, ArrowRight } from "./Icon";
import type { Gate } from "@/lib/progress/gating";

/** Explains WHY something is locked and links to the unblocking action (§12). */
export function LockedGate({ gate, lang, title }: { gate: Gate; lang: "en" | "hi"; title?: string }) {
  return (
    <div className="col-card col-empty" role="status">
      <Lock size={36} strokeWidth={1.5} aria-hidden />
      <p className="col-empty__title">{title ?? (lang === "hi" ? "Ye abhi locked hai" : "This is locked")}</p>
      <p style={{ margin: 0 }}>{lang === "hi" ? gate.reasonHi : gate.reason}</p>
      {gate.unlockHref && <Link href={gate.unlockHref} className="col-btn col-btn--primary mt-3">{lang === "hi" ? "Wahan le chalo" : "Take me there"} <ArrowRight size={16} aria-hidden /></Link>}
    </div>
  );
}

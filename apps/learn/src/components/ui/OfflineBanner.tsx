"use client";
import { useSyncExternalStore } from "react";
import { AlertTriangle } from "./Icon";
const sub = (cb: () => void) => { window.addEventListener("online", cb); window.addEventListener("offline", cb); return () => { window.removeEventListener("online", cb); window.removeEventListener("offline", cb); }; };
/** Shown when the browser reports no network. Exam autosave and journal saves retry on the next action; nothing is lost silently. */
export function OfflineBanner() {
  const online = useSyncExternalStore(sub, () => navigator.onLine, () => true);
  if (online) return null;
  return <div className="lrn-offline" role="status" aria-live="assertive"><AlertTriangle size={16} aria-hidden /> Aap offline hain. Answers aur journal device par rehte hain; connection aate hi save hoga. Tab tak submit mat kijiye.</div>;
}

"use client";
import { useSyncExternalStore } from "react";
import { useLang } from "@/lib/i18n/LangProvider";
import { t3 } from "@/lib/i18n/lang";
import { AlertTriangle } from "./Icon";

const S = {
  offline: t3("You are offline. Answers and journal stay on this device and save when the connection is back. Please do not submit until then.", "Aap offline hain. Answers aur journal isi device par rahenge, connection aate hi save ho jayenge. Tab tak submit mat kijiye.", "आप ऑफ़लाइन हैं। जवाब और जर्नल इसी डिवाइस पर रहेंगे, कनेक्शन आते ही सेव हो जाएँगे। तब तक सबमिट मत कीजिए।"),
};
const sub = (cb: () => void) => { window.addEventListener("online", cb); window.addEventListener("offline", cb); return () => { window.removeEventListener("online", cb); window.removeEventListener("offline", cb); }; };
/** Shown when the browser reports no network. Exam autosave and journal saves retry on the next action; nothing is lost silently. */
export function OfflineBanner() {
  const { tx } = useLang();
  const online = useSyncExternalStore(sub, () => navigator.onLine, () => true);
  if (online) return null;
  return <div className="lrn-offline" role="status" aria-live="assertive"><AlertTriangle size={16} aria-hidden /> {tx(S.offline)}</div>;
}

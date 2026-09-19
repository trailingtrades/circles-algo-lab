"use client";
import { useEffect, useRef, useState } from "react";
import { t3, type Lang } from "@/lib/i18n/lang";
import { useLang } from "@/lib/i18n/LangProvider";
import { Copy, Check } from "./Icon";
import type { Prompt } from "@/lib/content/course";

const S = {
  copy: t3("Copy prompt", "Prompt copy karein", "प्रॉम्प्ट कॉपी करें"),
  copied: t3("Copied", "Copy ho gaya", "कॉपी हो गया"),
  prompt: t3("Prompt", "Prompt", "प्रॉम्प्ट"),
};
/* The prompt body stays English (AI tools follow English instructions most reliably); what is copied asks the
   AI to answer in the learner's language. These lines are instructions to the AI, so they stay English too. */
const REPLY_IN: Record<Lang, string> = {
  en: "",
  hi: "Reply in simple Hinglish (Hindi written in Roman script).",
  dv: "Reply in simple Hindi, in Devanagari script.",
};

/** Mono prompt with a Copy button (1.6s "Copied" state, execCommand fallback). The reply-language line is shown
 *  under the body, so what the learner sees is exactly what gets copied. */
export function PromptBlock({ prompt }: { prompt: Prompt }) {
  const { lang, tx } = useLang();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const reply = REPLY_IN[lang];
  const text = reply ? `${prompt.body}\n\n${reply}` : prompt.body;
  async function copy() {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } finally { document.body.removeChild(ta); }
    }
    setCopied(true); clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 1600);
  }
  const title = tx(prompt.title);
  return (
    <section className="col-card__inner lrn-prompt" aria-label={`${tx(S.prompt)}: ${title}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <strong style={{ fontSize: "var(--col-text-body)" }}>{title}</strong>
        <button type="button" className="col-btn col-btn--ghost col-btn--sm" style={{ minHeight: 40 }} onClick={copy}>{copied ? <><Check size={14} aria-hidden /> {tx(S.copied)}</> : <><Copy size={14} aria-hidden /> {tx(S.copy)}</>}</button>
      </div>
      <pre className="lrn-prompt__body" lang="en">{prompt.body}{reply && <>{"\n\n"}<span className="lrn-muted">{reply}</span></>}</pre>
      <span className="sr-only" role="status" aria-live="polite">{copied ? tx(S.copied) : ""}</span>
    </section>
  );
}

"use client";
import { useState } from "react";
import { Copy, Check } from "./Icon";
import type { Prompt } from "@/lib/content/course";

/** Mono prompt with level + platform badges and a Copy button (1.6s "Copied" state, execCommand fallback). Prompts stay English in both modes (§13). */
export function PromptBlock({ prompt }: { prompt: Prompt }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(prompt.body); }
    catch {
      const ta = document.createElement("textarea"); ta.value = prompt.body; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } finally { document.body.removeChild(ta); }
    }
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  }
  return (
    <section className="col-card__inner lrn-prompt" aria-label={`Prompt: ${prompt.title}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap"><strong style={{ fontSize: "var(--col-text-body)" }}>{prompt.title}</strong><span className="col-chip">{prompt.level}</span><span className="col-chip">{prompt.platform}</span></div>
        <button type="button" className="col-btn col-btn--ghost col-btn--sm" onClick={copy} aria-live="polite">{copied ? <><Check size={14} aria-hidden /> Copied</> : <><Copy size={14} aria-hidden /> Copy</>}</button>
      </div>
      <pre className="lrn-prompt__body">{prompt.body}</pre>
    </section>
  );
}

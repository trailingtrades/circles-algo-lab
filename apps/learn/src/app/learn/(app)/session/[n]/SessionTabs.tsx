"use client";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { t3 } from "@/lib/i18n/lang";
import { useLang } from "@/lib/i18n/LangProvider";
import { ArrowRight, CheckCircle } from "@/components/ui/Icon";
import css from "@/components/lesson/lesson.module.css";

export type TabKey = "learn" | "kaam" | "ai" | "quiz" | "journal";
const KEYS: TabKey[] = ["learn", "kaam", "ai", "quiz", "journal"];
const S = {
  learn: t3("Learn", "Seekhiye", "सीखिए"),
  kaam: t3("Today's task", "Aaj Ka Kaam", "आज का काम"),
  ai: t3("AI Lab", "AI Lab", "AI लैब"),
  quiz: t3("Quiz", "Quiz", "क्विज़"),
  journal: t3("Journal", "Journal", "जर्नल"),
  sections: t3("Lesson sections", "Lesson ke hisse", "लेसन के हिस्से"),
  done: t3("done", "ho gaya", "पूरा"),
  next: t3("Next", "Aage", "आगे"),
};

/** Tab shell for a lesson. The panels arrive ready-made (mostly server-rendered); each is kept mounted and
 *  only hidden, so a half-written journal entry or picked quiz answers survive a tab switch. On a 360px phone
 *  the strip scrolls sideways, with a fade on the right edge while more tabs are out of view. */
export function SessionTabs({ panels, done }: { panels: Record<TabKey, ReactNode>; done: Partial<Record<TabKey, boolean>> }) {
  const { tx } = useLang();
  const [tab, setTab] = useState<TabKey>("learn");
  const wrap = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const btns = useRef<Partial<Record<TabKey, HTMLButtonElement | null>>>({});

  useEffect(() => {
    const el = bar.current, w = wrap.current; if (!el || !w) return;
    // A DOM flag, not state: it changes on every scroll frame and only CSS reads it.
    const update = () => { w.dataset.more = String(el.scrollLeft + el.clientWidth < el.scrollWidth - 2); };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update); ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, []);

  function go(k: TabKey, focus = false) {
    setTab(k);
    const b = btns.current[k];
    b?.scrollIntoView({ block: "nearest", inline: "nearest" });
    if (focus) b?.focus();
  }
  function onKey(e: KeyboardEvent) {
    const i = KEYS.indexOf(tab);
    const j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? KEYS.length - 1 : null;
    if (j === null) return;
    e.preventDefault();
    go(KEYS[(j + KEYS.length) % KEYS.length], true);
  }
  const next = KEYS[KEYS.indexOf(tab) + 1];
  return (
    <>
      <div ref={wrap} className={css.tabsWrap}>
        <div ref={bar} className={`col-tabs ${css.tabs}`} role="tablist" aria-label={tx(S.sections)} onKeyDown={onKey}>
          {KEYS.map((k) => (
            <button key={k} ref={(el) => { btns.current[k] = el; }} id={`tab-${k}`} role="tab" type="button" className="col-tab" aria-selected={tab === k} aria-controls={`panel-${k}`} tabIndex={tab === k ? 0 : -1} onClick={() => go(k)}>
              {tx(S[k])}
              {done[k] && <><CheckCircle size={13} className={css.tabDone} aria-hidden /><span className="sr-only"> ({tx(S.done)})</span></>}
            </button>
          ))}
        </div>
      </div>
      {KEYS.map((k) => (
        <div key={k} id={`panel-${k}`} role="tabpanel" aria-labelledby={`tab-${k}`} hidden={tab !== k} tabIndex={0} className={css.panel}>
          {panels[k]}
        </div>
      ))}
      {next && (
        <div className={css.nextTab}>
          <button type="button" className="col-btn col-btn--ghost" onClick={() => { go(next); wrap.current?.scrollIntoView({ block: "start", behavior: "smooth" }); }}>
            {tx(S.next)}: {tx(S[next])} <ArrowRight size={16} aria-hidden />
          </button>
        </div>
      )}
    </>
  );
}

"use client";
/* The parts of a lesson that need the browser: the class video's "watched" button, class-material links,
   the Aaj Ka Kaam checklist and the journal form. Everything else on the lesson page renders on the server. */
import { useRef, useState, useSyncExternalStore, useTransition } from "react";
import { t3, type Text } from "@/lib/i18n/lang";
import { useLang } from "@/lib/i18n/LangProvider";
import { markWatched, markHandoutOpened, saveJournal, type ActState } from "@/app/learn/(app)/session/actions";
import { AlertCircle, CheckCircle, ExternalLink } from "@/components/ui/Icon";
import css from "./lesson.module.css";

const S = {
  markWatched: t3("I have watched the class", "Maine class dekh li", "मैंने क्लास देख ली"),
  watched: t3("Marked as watched", "Dekh li, mark ho gaya", "देख ली, मार्क हो गया"),
  open: t3("Open", "Kholiye", "खोलिए"),
  opened: t3("Opened", "Khol liya", "खोल लिया"),
  newTab: t3("opens in a new tab", "naye tab mein khulega", "नए टैब में खुलेगा"),
  soon: t3("Coming soon", "Jald aayega", "जल्द आएगा"),
  stepsDone: (a: number, b: number) => t3(`${a} of ${b} steps done`, `${b} mein se ${a} step ho gaye`, `${b} में से ${a} स्टेप हो गए`),
  device: t3("Ticks are saved on this device only.", "Tick sirf is device par save hote hain.", "टिक सिर्फ़ इसी डिवाइस पर सेव होते हैं।"),
  entryType: t3("Entry type", "Entry ka type", "एंट्री का टाइप"),
  reflection: t3("Reflection", "Reflection", "रिफ़्लेक्शन"),
  galti: t3("Mistake log", "Galti-log", "ग़लती-लॉग"),
  weekly: t3("Weekly review", "Weekly review", "साप्ताहिक रिव्यू"),
  galtiHint: t3("Mistake log: one mistake you made, and the rule that would have stopped it.", "Galti-log: ek galti jo aapne ki, aur woh rule jo use rok sakta tha.", "ग़लती-लॉग: एक ग़लती जो आपसे हुई, और वह नियम जो उसे रोक सकता था।"),
  entry: t3("Your entry", "Aapki entry", "आपकी एंट्री"),
  oneLine: t3("One honest line is enough.", "Ek sachchi line bhi kaafi hai.", "एक सच्ची लाइन भी काफ़ी है।"),
  save: t3("Save journal", "Journal save karein", "जर्नल सेव करें"),
  saving: t3("Saving", "Save ho raha hai", "सेव हो रहा है"),
  saved: t3("Journal saved for this session. You can add more entries any time.", "Is session ka journal save ho gaya. Aur entries kabhi bhi jod sakte hain.", "इस सेशन का जर्नल सेव हो गया। और एंट्री कभी भी जोड़ सकते हैं।"),
  failed: t3("Could not save. Check your internet and try again.", "Save nahi ho paaya. Internet check karke dobara try kijiye.", "सेव नहीं हो पाया। इंटरनेट देखकर दोबारा कोशिश कीजिए।"),
};

function ErrorLine({ msg }: { msg?: string }) {
  return msg ? <p className="lrn-error" role="alert" style={{ margin: 0 }}><AlertCircle size={16} aria-hidden /> {msg}</p> : null;
}

/** Class recording + an honest "I have watched" button (YouTube gives no reliable watch time without its player API). */
export function VideoBlock({ n, embed, title, watched }: { n: number; embed: string; title: string; watched: boolean }) {
  const { tx } = useLang();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string>();
  return (
    <div className={css.video}>
      <div className="lrn-video"><iframe src={embed} title={title} allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" /></div>
      <div className={css.videoBar}>
        {watched ? <span className={css.ok}><CheckCircle size={16} aria-hidden /> {tx(S.watched)}</span>
          : <button type="button" className="col-btn col-btn--ghost" disabled={pending} onClick={() => start(async () => { const r = await markWatched(n, 100); setErr(r.error); })}>{tx(S.markWatched)}</button>}
      </div>
      <ErrorLine msg={err} />
    </div>
  );
}

export type ResItem = { id: string; label: string; meta: string; href: string | null; handout: boolean };

/** Decks and handouts. A link opens the file in a new tab; opening a handout also records it for attendance. */
export function ResourceList({ n, items, handoutOpened }: { n: number; items: ResItem[]; handoutOpened: boolean }) {
  const { tx } = useLang();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string>();
  const record = () => { if (!handoutOpened && !pending) start(async () => { const r = await markHandoutOpened(n); setErr(r.error); }); };
  return (
    <>
      <ul className={css.res}>
        {items.map((r) => (
          <li key={r.id} className={css.resItem}>
            <div className={css.resText}>
              <span className={css.resName}>{r.label}</span>
              {(r.meta || (r.handout && handoutOpened)) && <span className={css.resMeta}>{r.meta}{r.handout && handoutOpened && <>{r.meta && " · "}<CheckCircle size={13} aria-hidden /> {tx(S.opened)}</>}</span>}
            </div>
            {r.href
              ? <a href={r.href} target="_blank" rel="noopener noreferrer" className={`col-btn col-btn--ghost col-btn--sm ${css.resOpen}`} onClick={r.handout ? record : undefined}><ExternalLink size={14} aria-hidden /> {tx(S.open)}<span className="sr-only"> ({tx(S.newTab)})</span></a>
              : <span className={css.soon}>{tx(S.soon)}</span>}
          </li>
        ))}
      </ul>
      <ErrorLine msg={err} />
    </>
  );
}

/* Aaj Ka Kaam ticks live in localStorage (per session, per device), read through useSyncExternalStore so the
   server render and the first client render agree. A memory copy keeps ticks working when storage is blocked. */
const kaamKey = (n: number) => `smart.kaam.s${n}`;
const kaamMem = new Map<string, string>();
const kaamSubs = new Set<() => void>();
function kaamSubscribe(cb: () => void) {
  kaamSubs.add(cb);
  const onStorage = (e: StorageEvent) => { if (!e.key || e.key.startsWith("smart.kaam.")) cb(); };
  window.addEventListener("storage", onStorage);
  return () => { kaamSubs.delete(cb); window.removeEventListener("storage", onStorage); };
}
function kaamRead(n: number) { try { return window.localStorage.getItem(kaamKey(n)) ?? kaamMem.get(kaamKey(n)) ?? ""; } catch { return kaamMem.get(kaamKey(n)) ?? ""; } }
function kaamWrite(n: number, v: string) {
  kaamMem.set(kaamKey(n), v);
  try { window.localStorage.setItem(kaamKey(n), v); } catch { /* private mode: the memory copy still works for this visit */ }
  kaamSubs.forEach((f) => f());
}

/** Numbered checklist for today's task. */
export function KaamSteps({ n, steps }: { n: number; steps: string[] }) {
  const { tx } = useLang();
  const raw = useSyncExternalStore(kaamSubscribe, () => kaamRead(n), () => "");
  const done = new Set(raw.split(",").filter(Boolean).map(Number).filter((i) => Number.isInteger(i) && i >= 0 && i < steps.length));
  const toggle = (i: number) => { const next = new Set(done); if (next.has(i)) next.delete(i); else next.add(i); kaamWrite(n, [...next].sort((a, b) => a - b).join(",")); };
  return (
    <>
      <ol className={css.steps}>
        {steps.map((s, i) => (
          <li key={i}>
            <label className={`${css.step}${done.has(i) ? ` ${css.stepDone}` : ""}`}>
              <input type="checkbox" checked={done.has(i)} onChange={() => toggle(i)} />
              <span className={css.stepNum} aria-hidden>{i + 1}</span>
              <span className={css.stepText}>{s}</span>
            </label>
          </li>
        ))}
      </ol>
      <p className={css.stepsNote} aria-live="polite">{tx(S.stepsDone(done.size, steps.length))}. {tx(S.device)}</p>
    </>
  );
}

/** Journal entry for this session. Weekly review is offered only on the week's review day (the server enforces it too). */
export function JournalForm({ n, prompt, review, saved }: { n: number; prompt: Text; review: boolean; saved: boolean }) {
  const { tx } = useLang();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActState>({});
  const [kind, setKind] = useState(review ? "friday_review" : "reflection");
  const form = useRef<HTMLFormElement>(null);
  const q = tx(prompt);
  return (
    <form ref={form} className="lrn-list" style={{ maxWidth: "72ch" }} onSubmit={(e) => {
      e.preventDefault();
      if (pending) return;
      const f = new FormData(e.currentTarget);
      start(async () => {
        try {
          const r = await saveJournal(n, String(f.get("body") ?? ""), kind); setMsg(r);
          if (r.ok) { form.current?.reset(); if (kind === "friday_review") setKind("reflection"); } // one weekly review per week
        }
        catch { setMsg({ error: tx(S.failed) }); }
      });
    }}>
      {q && <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, fontWeight: 500 }}>{q}</p>}
      <p className="lrn-muted" style={{ margin: 0 }}>{tx(S.oneLine)}</p>
      <div className="lrn-field" style={{ margin: 0 }}>
        <label htmlFor={`jk-${n}`}>{tx(S.entryType)}</label>
        <select id={`jk-${n}`} name="kind" className="col-input" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="reflection">{tx(S.reflection)}</option>
          <option value="galti_log">{tx(S.galti)}</option>
          {review && <option value="friday_review">{tx(S.weekly)}</option>}
        </select>
        {kind === "galti_log" && <span className="lrn-muted" style={{ fontSize: "var(--col-text-body-sm)" }}>{tx(S.galtiHint)}</span>}
      </div>
      <div className="lrn-field" style={{ margin: 0 }}>
        <label htmlFor={`jb-${n}`}>{tx(S.entry)}</label>
        <textarea id={`jb-${n}`} name="body" className="col-input lrn-textarea" minLength={10} maxLength={4000} required style={{ fontFamily: "var(--col-font-sans)" }} />
      </div>
      <div><button className="col-btn col-btn--primary" disabled={pending}>{pending ? tx(S.saving) : tx(S.save)}</button></div>
      {(saved || msg.ok) && <p className="lrn-notice" role="status" style={{ margin: 0 }}><CheckCircle size={16} aria-hidden /> {tx(S.saved)}</p>}
      <ErrorLine msg={msg.error} />
    </form>
  );
}

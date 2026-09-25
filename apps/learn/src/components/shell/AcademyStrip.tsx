"use client";
import { useRef, useState } from "react";
import { useLang } from "@/lib/i18n/LangProvider";
import { t3, tr } from "@/lib/i18n/lang";
import { Home, ChevronRight, Lock, X } from "@/components/ui/Icon";
import { payUrl } from "@/lib/payments";

const S = {
  nav: t3("5 Circles Academy stages", "5 Circles Academy ke stages", "5 Circles Academy के चरण"),
  // Same words as the WINNERS and O.N.E strips, so the ladder reads identically on all three stages.
  stage: t3("Stage", "Stage", "चरण"),
  soon: t3("soon", "jald", "जल्द"),
  locked: t3("locked", "band", "बंद"),
  lockedWhy: t3("Opens when this stage is unlocked for you", "Ye stage aapke liye unlock hone par khulega", "यह चरण आपके लिए अनलॉक होने पर खुलेगा"),
  // Single line: check_compliance.py allows Devanagari only on a line that carries the t3( call.
  lockedBody: t3("This stage is not part of your enrolment yet. Message us on WhatsApp to enrol, and it unlocks on this same login.", "Ye stage abhi aapke enrolment mein nahi hai. WhatsApp par message kijiye — enrol hote hi isi login par unlock ho jayega.", "यह चरण अभी आपके एनरोलमेंट में नहीं है। WhatsApp पर मैसेज कीजिए — एनरोल होते ही इसी लॉगिन पर अनलॉक हो जाएगा।"),
  unlockWa: t3("Unlock on WhatsApp", "WhatsApp par unlock kijiye", "WhatsApp पर अनलॉक कीजिए"),
  enrolPay: t3("Enrol and pay", "Enrol karke pay kijiye", "एनरोल करके पेमेंट कीजिए"),
  details: t3("Course details", "Course details", "कोर्स की जानकारी"),
  close: t3("Close", "Band kijiye", "बंद कीजिए"),
  waText: (name: string) => t3(`Hi, I want to enrol in ${name} at the 5 Circles Academy. Please share the details.`, `Namaste, mujhe 5 Circles Academy ka ${name} join karna hai. Details bata dijiye.`, `नमस्ते, मुझे 5 Circles Academy का ${name} जॉइन करना है। डिटेल्स बता दीजिए।`),
};
// The Academy's enrolment line — same number as AuthLinks, the landing and the WhatsApp FAB.
const WA = "https://wa.me/916387497277";

/* Academy strip — where this programme sits on the 5 Circles ladder, and the way back.
   Same recipe as the CIRCLE O.N.E header strip. Plain <a> on purpose: every target lives outside the
   /smart basePath, and each href is the final URL (trailing slash, no redirect hop). `unlocked` comes
   from stage_access in the app layout; when it is unknown (sign-in page) the stages stay plain links
   and nginx's gate decides. A locked stage is shown as locked instead of silently bouncing home. */
export function AcademyStrip({ unlocked, current = "smart" }: { unlocked?: { funda: boolean; winners: boolean; one: boolean }; current?: "start" | "smart" | "funda" | "winners" | "one" }) {
  const { tx, lang } = useLang();
  const dlg = useRef<HTMLDialogElement>(null);
  const [ask, setAsk] = useState<{ n: number; key: string; name: string; about: string } | null>(null);
  const sep = <ChevronRight size={12} strokeWidth={1.75} className="sep" aria-hidden />;
  const stage = (n: number) => `${tx(S.stage)} ${n}`;
  const open = (n: number, key: string, name: string, about: string) => { setAsk({ n, key, name, about }); dlg.current?.showModal(); };
  // `current` marks the stage being viewed (the sign-in gate passes the stage the learner is
  // heading to via ?next=, so the strip highlight matches the hero); a lock always wins over it.
  // A locked stage is a button that opens the unlock dialog (course details + WhatsApp enrolment),
  // so the ladder shows the way up instead of a dead end.
  const sib = (n: number, key: "start" | "smart" | "funda" | "winners" | "one", href: string, name: string, open_: boolean | undefined) => open_ === false
    ? <button type="button" className="sib lock" title={tx(S.lockedWhy)} onClick={() => open(n, key, name, `${href}about/`)}><Lock size={11} strokeWidth={1.75} aria-hidden />{stage(n)} · {name}<span className="sr-only"> ({tx(S.locked)})</span></button>
    : current === key
      ? <span className="on" aria-current="true">{stage(n)} · {name}</span>
      : <a className="sib" href={href}>{stage(n)} · {name}</a>;
  return (
    <div className="lrn-max lrn-acadwrap">
      <nav className="acad" aria-label={tx(S.nav)}>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the Academy landing is a separate static site at "/", not an app route */}
        <a className="home" href="/"><Home size={12} strokeWidth={1.75} aria-hidden />5 Circles Academy</a>{sep}
        {/* Stage 0 is free with every account (sign-in only, no grant), so it is always a plain link. */}
        {sib(0, "start", "/smart/stage0/", "Circle S.T.A.R.T", undefined)}{sep}
        {sib(1, "smart", "/smart/learn", "Circle S.M.A.R.T", undefined)}{sep}
        {sib(2, "funda", "/funda/", "Circle F.U.N.D.A", unlocked?.funda)}{sep}
        {sib(3, "winners", "/winners/", "Circle W.I.N.N.E.R.S", unlocked?.winners)}{sep}
        {sib(4, "one", "/one/", "Circle O.N.E", unlocked?.one)}{sep}
        <span className="soon">{stage(5)} · Circle Pro — {tx(S.soon)}</span>
      </nav>
      <dialog ref={dlg} className="lrn-unlock" aria-label={ask ? `${stage(ask.n)} · ${ask.name}` : undefined} onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
        {ask && (
          <div className="lrn-unlock__in">
            <button type="button" className="lrn-unlock__x" onClick={() => dlg.current?.close()} aria-label={tx(S.close)}><X size={16} strokeWidth={1.75} aria-hidden /></button>
            <p className="lrn-unlock__kick"><Lock size={13} strokeWidth={1.75} aria-hidden /> {stage(ask.n)} · {tx(S.locked)}</p>
            <h2 className="lrn-unlock__h">{ask.name}</h2>
            <p className="lrn-unlock__p">{tx(S.lockedBody)}</p>
            <div className="lrn-unlock__cta">
              {/* A configured Razorpay Payment Page (details + payment in one) leads; without one,
                  WhatsApp enrolment is the primary and only route. */}
              {payUrl(ask.key)
                ? <a className="col-btn col-btn--primary" href={payUrl(ask.key)!} target="_blank" rel="noopener noreferrer">{tx(S.enrolPay)}</a>
                : <a className="col-btn col-btn--primary" href={`${WA}?text=${encodeURIComponent(tr(S.waText(ask.name), lang))}`} target="_blank" rel="noopener noreferrer">{tx(S.unlockWa)}</a>}
              {payUrl(ask.key) && <a className="col-btn" href={`${WA}?text=${encodeURIComponent(tr(S.waText(ask.name), lang))}`} target="_blank" rel="noopener noreferrer">{tx(S.unlockWa)}</a>}
              <a className="col-btn" href={ask.about}>{tx(S.details)}</a>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}

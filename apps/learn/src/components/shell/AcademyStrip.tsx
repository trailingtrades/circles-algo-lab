"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { t3 } from "@/lib/i18n/lang";
import { Home, ChevronRight, Lock } from "@/components/ui/Icon";

const S = {
  nav: t3("5 Circles Academy stages", "5 Circles Academy ke stages", "5 Circles Academy के चरण"),
  // Same words as the WINNERS and O.N.E strips, so the ladder reads identically on all three stages.
  stage: t3("Stage", "Stage", "चरण"),
  soon: t3("soon", "jald", "जल्द"),
  locked: t3("locked", "band", "बंद"),
  lockedWhy: t3("Opens when this stage is unlocked for you", "Ye stage aapke liye unlock hone par khulega", "यह चरण आपके लिए अनलॉक होने पर खुलेगा"),
};

/* Academy strip — where this programme sits on the 5 Circles ladder, and the way back.
   Same recipe as the CIRCLE O.N.E header strip. Plain <a> on purpose: every target lives outside the
   /smart basePath, and each href is the final URL (trailing slash, no redirect hop). `unlocked` comes
   from stage_access in the app layout; when it is unknown (sign-in page) the stages stay plain links
   and nginx's gate decides. A locked stage is shown as locked instead of silently bouncing home. */
export function AcademyStrip({ unlocked }: { unlocked?: { winners: boolean; one: boolean } }) {
  const { tx } = useLang();
  const sep = <ChevronRight size={12} strokeWidth={1.75} className="sep" aria-hidden />;
  const stage = (n: number) => `${tx(S.stage)} ${n}`;
  const sib = (n: number, href: string, name: string, open: boolean | undefined) => open === false
    ? <span className="sib lock" title={tx(S.lockedWhy)}><Lock size={11} strokeWidth={1.75} aria-hidden />{stage(n)} · {name}<span className="sr-only"> ({tx(S.locked)})</span></span>
    : <a className="sib" href={href}>{stage(n)} · {name}</a>;
  return (
    <div className="lrn-max lrn-acadwrap">
      <nav className="acad" aria-label={tx(S.nav)}>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the Academy landing is a separate static site at "/", not an app route */}
        <a className="home" href="/"><Home size={12} strokeWidth={1.75} aria-hidden />5 Circles Academy</a>{sep}
        <span className="on" aria-current="true">{stage(1)} · Circle S.M.A.R.T</span>{sep}
        {sib(2, "/winners/", "Circle W.I.N.N.E.R.S", unlocked?.winners)}{sep}
        {sib(3, "/one/", "Circle O.N.E", unlocked?.one)}{sep}
        <span className="soon">{stage(4)} · Circle Pro — {tx(S.soon)}</span>
      </nav>
    </div>
  );
}

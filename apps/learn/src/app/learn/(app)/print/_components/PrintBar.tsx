import Link from "next/link";
import { LANGS, t3, tr, type L, type Lang } from "@/lib/i18n/lang";
import { ChevronLeft } from "@/components/ui/Icon";
import { PrintButton } from "./PrintButton";
import "@/styles/print.css";

export const PB = {
  print: t3("Print / Save as PDF", "Print / PDF save kijiye", "प्रिंट / PDF सेव कीजिए"),
  tip: t3("In the print window choose \"Save as PDF\" (or your printer) and paper size A4. Each page carries the SEBI registration line and a page number.", "Print window mein \"Save as PDF\" (ya apna printer) aur paper size A4 chuniye. Har page par SEBI registration line aur page number aata hai.", "प्रिंट विंडो में \"Save as PDF\" (या अपना प्रिंटर) और पेपर साइज़ A4 चुनिए। हर पेज पर SEBI रजिस्ट्रेशन लाइन और पेज नंबर आता है।"),
  edition: t3("Edition", "Edition", "एडिशन"),
};

/** Screen-only bar above the handout: back link, the language of the printed copy, extra links, the print button.
 *  Hidden on paper (print.css). Locked (printable false): the back link only. */
export function PrintBar({ lang, uiLang, back, hrefFor, extra, printable = true }: { lang: Lang; uiLang: Lang; back: { href: string; label: L }; hrefFor: (l: Lang) => string; extra?: { href: string; label: L }; printable?: boolean }) {
  if (!printable) return <nav className="prt-bar" aria-label={tr(PB.edition, uiLang)}><Link href={back.href} className="lrn-link prt-bar__back"><ChevronLeft size={14} aria-hidden /> {tr(back.label, uiLang)}</Link></nav>;
  return (
    <nav className="prt-bar" aria-label={tr(PB.edition, uiLang)}>
      <Link href={back.href} className="lrn-link prt-bar__back"><ChevronLeft size={14} aria-hidden /> {tr(back.label, uiLang)}</Link>
      <span className="prt-bar__grow" />
      <span className="prt-bar__langs">
        {LANGS.map((l) => <Link key={l.k} href={hrefFor(l.k)} className="prt-bar__lang" aria-current={l.k === lang ? "true" : undefined} lang={l.html}>{l.label}</Link>)}
      </span>
      {extra && <Link href={extra.href} className="col-btn col-btn--ghost col-btn--sm">{tr(extra.label, uiLang)}</Link>}
      <PrintButton label={tr(PB.print, uiLang)} />
      <p className="prt-bar__tip">{tr(PB.tip, uiLang)}</p>
    </nav>
  );
}

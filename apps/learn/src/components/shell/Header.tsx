"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n/LangProvider";
import { LANGS, t3, type Lang } from "@/lib/i18n/lang";
import { NAV, isActive, staffNav, type Role } from "./navItems";
import { Sun, Moon, Languages, ChevronDown } from "@/components/ui/Icon";

const S = {
  by: t3("Stage 1 · 5 Circles Academy", "Stage 1 · 5 Circles Academy", "स्टेज 1 · 5 Circles Academy"),
  academy: t3("5 Circles Academy home", "5 Circles Academy home", "5 Circles Academy होम"),
  menu: t3("Main menu", "Main menu", "मुख्य मेन्यू"),
  profile: t3("Your profile", "Aapki profile", "आपकी प्रोफ़ाइल"),
};

/* Live Winners header recipe: centered max-width row — brand lockup, one pill group of icon nav
   chips, a language select, a theme icon button, and the student chip on the right. Active chip is
   a --brand fill with --brand-ink text (never white on the dark cyan). Below 768px the pill nav
   hides (the bottom nav takes over) and the lockup shrinks so nothing clips at 360px. */
export function Header({ studentName, role }: { studentName?: string; role?: Role }) {
  const { lang, setLang, theme, setTheme, t, tx } = useLang();
  const path = usePathname();
  const name = studentName?.trim() || t("student");
  const cur = LANGS.find((l) => l.k === lang) ?? LANGS[0];
  return (
    <header className="col-header lrn-header" role="banner">
      <div className="lrn-max lrn-hdr">
        <span className="lrn-brand">
          {/* Logo = back to the Academy landing at the domain root, outside the /smart basePath —
              same behaviour as the Winners top bar. The wordmark stays in-app. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the Academy landing is a separate static site at "/", not an app route */}
          <a href="/" title="5 Circles Academy" aria-label={tx(S.academy)} className="lrn-brand__logo">
            <Image src={(process.env.NEXT_PUBLIC_BASE_PATH || "") + "/brand/logo.png"} alt="" width={48} height={48} priority />
          </a>
          <Link href="/learn/home" className="lrn-brand__link">
            <span className="lrn-brand__name wm">CIRCLE S.M.A.R.T</span>
            <span className="lrn-brand__by">{tx(S.by)}</span>
          </Link>
        </span>
        <nav className="lrn-pillnav" aria-label={tx(S.menu)}>
          {[...NAV, ...staffNav(role)].map(({ href, label, icon: I }) => (
            <Link key={href} href={href} className="lrn-pill" aria-current={isActive(path, href) ? "page" : undefined}>
              <I size={15} strokeWidth={1.75} aria-hidden />{tx(label)}
            </Link>
          ))}
        </nav>
        <div className="lrn-hdr__ctl">
          {/* Native select laid invisibly over the pill: three choices, keyboard- and screen-reader-
              friendly, the phone's own picker, no menu JS. The pill shows the current language
              (full name on wide screens, EN / Hing / short Hindi on phones). */}
          <label className="lrn-langpill lrn-langsel" title={t("switchLang")}>
            <Languages size={15} strokeWidth={1.75} aria-hidden className="lrn-langsel__ico" />
            <span aria-hidden className="lrn-langsel__cur"><span className="lrn-langsel__long">{cur.label}</span><span className="lrn-langsel__short">{cur.short}</span></span>
            <ChevronDown size={14} strokeWidth={1.75} aria-hidden />
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label={t("language")}>
              {LANGS.map((l) => <option key={l.k} value={l.k}>{l.label}</option>)}
            </select>
          </label>
          <button type="button" className="lrn-iconbtn" aria-label={theme === "dark" ? t("themeLight") : t("themeDark")} title={theme === "dark" ? t("themeLight") : t("themeDark")}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun size={17} strokeWidth={1.75} aria-hidden /> : <Moon size={17} strokeWidth={1.75} aria-hidden />}
          </button>
          <Link href="/learn/profile" className="lrn-student" title={name} aria-label={`${tx(S.profile)}: ${name}`}>
            <span className="lrn-student__ava" aria-hidden>{name.charAt(0)}</span>
            <span className="lrn-student__name" aria-hidden>{name}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

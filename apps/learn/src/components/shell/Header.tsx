"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n/LangProvider";
import { LANGS, type Lang } from "@/lib/i18n/lang";
import { NAV } from "./nav";
import { Sun, Moon, Languages, BookOpen, Settings } from "@/components/ui/Icon";

/* Live Winners header recipe: centered max-width row — brand lockup, one pill
   group of icon nav chips, a language pill, a theme icon button, and the
   student chip on the right. Active chip is a --brand fill with --brand-ink
   text (never white on the dark cyan). */
export function Header({ studentName, role }: { studentName?: string; role?: "student" | "mentor" | "admin" }) {
  const { lang, setLang, theme, setTheme, t } = useLang();
  const path = usePathname();
  const name = studentName?.trim() || "Student";
  // Staff-only chips: students never see these; the pages themselves re-check the role server-side.
  const staff = role === "admin"
    ? [{ href: "/learn/mentor", label: "Mentor", icon: BookOpen }, { href: "/learn/admin", label: "Admin", icon: Settings }]
    : role === "mentor" ? [{ href: "/learn/mentor", label: "Mentor", icon: BookOpen }] : [];
  return (
    <header className="col-header" role="banner" style={{ height: "auto", minHeight: 64, padding: "8px 16px" }}>
      <div className="lrn-max flex items-center justify-between gap-3">
        <span className="lrn-brand">
          {/* Logo = back to the Academy landing (domain root, outside the /smart basePath) —
              same behaviour as the Winners top bar. The wordmark stays in-app. */}
          <a href="/" title="5 Circles Academy" aria-label="5 Circles Academy home">
            <Image src={(process.env.NEXT_PUBLIC_BASE_PATH || "") + "/brand/logo.png"} alt="5 Circles" width={48} height={48} priority />
          </a>
          <Link href="/learn/home" className="min-w-0" style={{ textDecoration: "none" }}>
            <span className="lrn-brand__name wm block" style={{ fontSize: 22, letterSpacing: ".04em" }}>CIRCLE S.M.A.R.T</span>
            <span className="lrn-brand__by">Level 1 · by 5 Circles</span>
          </Link>
        </span>
        <nav className="lrn-pillnav" aria-label="Primary">
          {[...NAV, ...staff].map(({ href, label, icon: I }) => (
            <Link key={href + label} href={href} className="lrn-pill" aria-current={path.startsWith(href) ? "page" : undefined}>
              <I size={15} strokeWidth={1.75} aria-hidden />{label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {/* Native select: three choices, keyboard- and screen-reader-friendly, no menu JS. */}
          <label className="lrn-langpill lrn-langsel" title={t("switchLang")}>
            <Languages size={15} strokeWidth={1.75} aria-hidden />
            <span className="sr-only">{t("language")}</span>
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label={t("switchLang")}>
              {LANGS.map((l) => <option key={l.k} value={l.k}>{l.label}</option>)}
            </select>
          </label>
          <button type="button" className="lrn-iconbtn" aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun size={17} strokeWidth={1.75} aria-hidden /> : <Moon size={17} strokeWidth={1.75} aria-hidden />}
          </button>
          <span className="lrn-student" title={name}>
            <span className="lrn-student__ava" aria-hidden>{name.charAt(0)}</span>
            <span className="lrn-student__name">{name}</span>
          </span>
        </div>
      </div>
    </header>
  );
}

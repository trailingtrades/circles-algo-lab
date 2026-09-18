"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n/LangProvider";
import { NAV } from "./nav";
import { Sun, Moon, Languages, BookOpen, Settings } from "@/components/ui/Icon";

/* Live Winners header recipe: centered max-width row — brand lockup, one pill
   group of icon nav chips, a language pill, a theme icon button, and the
   student chip on the right. Active chip is a --brand fill with --brand-ink
   text (never white on the dark cyan). */
export function Header({ studentName, role }: { studentName?: string; role?: "student" | "mentor" | "admin" }) {
  const { lang, setLang, theme, setTheme } = useLang();
  const path = usePathname();
  const name = studentName?.trim() || "Student";
  // Staff-only chips: students never see these; the pages themselves re-check the role server-side.
  const staff = role === "admin"
    ? [{ href: "/learn/mentor", label: "Mentor", icon: BookOpen }, { href: "/learn/admin", label: "Admin", icon: Settings }]
    : role === "mentor" ? [{ href: "/learn/mentor", label: "Mentor", icon: BookOpen }] : [];
  return (
    <header className="col-header" role="banner" style={{ height: "auto", minHeight: 64, padding: "8px 16px" }}>
      <div className="lrn-max flex items-center justify-between gap-3">
        <Link href="/learn/home" className="lrn-brand">
          <Image src={(process.env.NEXT_PUBLIC_BASE_PATH || "") + "/brand/logo.png"} alt="5 Circles" width={36} height={36} priority />
          <span className="min-w-0">
            <span className="lrn-brand__name wm block" style={{ fontSize: 17 }}>CIRCLE S.M.A.R.T</span>
            <span className="lrn-brand__by">Level 1 · by 5 Circles</span>
          </span>
        </Link>
        <nav className="lrn-pillnav" aria-label="Primary">
          {[...NAV, ...staff].map(({ href, label, icon: I }) => (
            <Link key={href + label} href={href} className="lrn-pill" aria-current={path.startsWith(href) ? "page" : undefined}>
              <I size={15} strokeWidth={1.75} aria-hidden />{label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button type="button" className="lrn-langpill" aria-pressed={lang === "hi"} aria-label="Switch language" onClick={() => setLang(lang === "en" ? "hi" : "en")}>
            <Languages size={15} strokeWidth={1.75} aria-hidden />{lang === "en" ? "EN" : "HI"}
          </button>
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

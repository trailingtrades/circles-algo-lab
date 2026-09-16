"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n/LangProvider";
import { NAV } from "./nav";
import { Eye, EyeOff } from "@/components/ui/Icon";

/* Winners header recipe: one pill group of nav chips + a student chip on the
   right. The active chip is a --brand fill with --brand-ink text (never white
   on the dark cyan). The pill group replaces the sidebar on desktop; the
   mobile bottom nav stays. */
export function Header({ studentName }: { studentName?: string }) {
  const { lang, setLang, theme, setTheme } = useLang();
  const path = usePathname();
  const name = studentName?.trim() || "Student";
  return (
    <header className="col-header" role="banner">
      <Link href="/learn/home" className="lrn-brand">
        <Image src="/brand/logo.png" alt="5 Circles" width={32} height={32} priority />
        <span className="min-w-0">
          <span className="lrn-brand__name wm block">5C Learn</span>
        </span>
      </Link>
      <nav className="lrn-pillnav" aria-label="Primary">
        {NAV.map(({ href, label }) => (
          <Link key={href + label} href={href} className="lrn-pill" aria-current={path.startsWith(href) ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <button type="button" className="lrn-toggle" aria-pressed={lang === "hi"} aria-label="Switch language" onClick={() => setLang(lang === "en" ? "hi" : "en")}>
          {lang === "en" ? "EN" : "HI"}
        </button>
        <button type="button" className="lrn-toggle" aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Eye size={16} aria-hidden /> : <EyeOff size={16} aria-hidden />}
        </button>
        <span className="lrn-student" title={name}>
          <span className="lrn-student__ava" aria-hidden>{name.charAt(0)}</span>
          <span className="lrn-student__name">{name}</span>
        </span>
      </div>
    </header>
  );
}

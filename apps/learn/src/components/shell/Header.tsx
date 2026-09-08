"use client";
import Link from "next/link";
import Image from "next/image";
import { useLang } from "@/lib/i18n/LangProvider";
import { CREDENTIAL_LINE } from "@/lib/compliance/strings";
import { Eye, EyeOff } from "@/components/ui/Icon";

export function Header() {
  const { lang, setLang, theme, setTheme } = useLang();
  return (
    <header className="col-header" role="banner">
      <Link href="/learn/home" className="lrn-brand">
        <Image src="/brand/logo.png" alt="5 Circles" width={32} height={32} priority />
        <span className="min-w-0">
          <span className="lrn-brand__name block">5C Learn</span>
          <span className="lrn-brand__sub block">{CREDENTIAL_LINE}</span>
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <button type="button" className="lrn-toggle" aria-pressed={lang === "hi"} aria-label="Switch language" onClick={() => setLang(lang === "en" ? "hi" : "en")}>
          {lang === "en" ? "EN" : "HI"}
        </button>
        <button type="button" className="lrn-toggle" aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Eye size={16} aria-hidden /> : <EyeOff size={16} aria-hidden />}
        </button>
      </div>
    </header>
  );
}

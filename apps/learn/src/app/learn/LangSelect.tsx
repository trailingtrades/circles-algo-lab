"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { LANGS, type Lang } from "@/lib/i18n/lang";
import { Languages } from "@/components/ui/Icon";

/** Same three-way native select as the app header, for the screens that have no header (sign-in,
 *  reset, invite). Switching writes the shared cookie and re-renders the server parts. */
export function LangSelect() {
  const { lang, setLang, t } = useLang();
  return (
    <label className="lrn-langpill lrn-langsel" title={t("switchLang")}>
      <Languages size={15} strokeWidth={1.75} aria-hidden />
      <span className="sr-only">{t("language")}</span>
      <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label={t("switchLang")}>
        {LANGS.map((l) => <option key={l.k} value={l.k}>{l.label}</option>)}
      </select>
    </label>
  );
}

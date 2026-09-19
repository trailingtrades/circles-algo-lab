"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { bandLabel } from "@/lib/scoring/rules";
import { t3, tr, type Lang } from "@/lib/i18n/lang";
import { Target } from "./Icon";

const S = { unranked: t3("Not ranked yet", "Abhi rank nahi mili", "अभी रैंक नहीं मिली"), cohort: t3("in your cohort", "aapke batch mein", "आपके बैच में") };

/** Position or band only. Never a number that looks like money (§12). `lang` from the page wins; otherwise the header's choice. */
export function RankChip({ rank, band, lang }: { rank: number | null; band: string | null; lang?: Lang }) {
  const ctx = useLang(); const l = lang ?? ctx.lang;
  const text = rank && rank <= 10 ? `#${rank} ${tr(S.cohort, l)}` : band ? bandLabel(band, l) : tr(S.unranked, l);
  return <span className="col-chip"><Target size={14} strokeWidth={1.75} aria-hidden />{text}</span>;
}

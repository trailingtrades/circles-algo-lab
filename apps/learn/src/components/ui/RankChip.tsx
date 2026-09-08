import { Target } from "./Icon";
/** Position or band only. Never a number that looks like money (§12). */
export function RankChip({ rank, band }: { rank: number | null; band: string | null }) {
  const text = rank && rank <= 10 ? `#${rank} in cohort` : band ?? "Unranked";
  return <span className="col-chip"><Target size={14} strokeWidth={1.75} aria-hidden />{text}</span>;
}

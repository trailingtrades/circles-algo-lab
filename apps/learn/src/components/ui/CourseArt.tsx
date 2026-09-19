import * as React from "react";
import { CandlestickChart, Target, Shield, BookOpen, type IconProps } from "./Icon";

/* Cover art for session cards: one icon per week and a brand-blue tint that deepens week by week.
   Sessions carry no artwork of their own, so this is a lookup with a fallback. Tints stay inside the
   brand blue ramp (the brand allows blue + red; green is for price direction only), and they step
   by WEEK so a week reads as one group instead of a rainbow of per-session colours. */
type Art = [React.ComponentType<IconProps>, string];

const WEEK_ICON: Record<string, React.ComponentType<IconProps>> = {
  "foundation-w1": CandlestickChart,
  "foundation-w2": Target,
  "foundation-w3": Shield,
};

// Hex (not CSS vars) because Cover appends alpha suffixes to build its gradient.
const WEEK_TINT = ["#22b8f5", "#1497dc", "#0b74b8"];
export function courseArt(level: string, week: number): Art {
  return [WEEK_ICON[`${level}-w${week}`] ?? BookOpen, WEEK_TINT[(Math.max(1, week) - 1) % WEEK_TINT.length]];
}

/** Icon/tint cover with the big session number (Winners module-card recipe). */
export function Cover({ level, week, n, size = 30 }: { level: string; week: number; n?: number; size?: number }) {
  const [Glyph, tint] = courseArt(level, week);
  return (
    <div className="lrn-cover" aria-hidden>
      <div className="lrn-cover__tint" style={{ background: `linear-gradient(135deg, ${tint}b8, ${tint}2e 70%, transparent)` }} />
      <Glyph size={size} strokeWidth={1.5} />
      {n != null && <span className="lrn-cover__num">{String(n).padStart(2, "0")}</span>}
    </div>
  );
}

/* Five concentric partial rings behind the sign-in gate: the same geometry the Winners gate uses, so the
   stages look related. Brand blues only and no glow halo; decoration, hidden from screen readers. */
const RING_COLORS = ["#22b8f5", "#38bdf8", "#1497dc", "#0b74b8", "#7cc8ee"];
export function RingsArt() {
  return (
    <svg viewBox="0 0 500 500" aria-hidden>
      {RING_COLORS.map((c, i) => {
        const r = 60 + i * 38;
        const len = r * 6.283;
        return (
          <circle key={c} cx="250" cy="250" r={r} fill="none" stroke={c}
            strokeOpacity={0.5 - i * 0.07} strokeWidth={10 - i}
            strokeDasharray={`${len * (0.35 + i * 0.12)} ${len}`}
            transform={`rotate(${-90 + i * 37} 250 250)`} />
        );
      })}
    </svg>
  );
}

/** Segmented progress ring (hero panel): one segment per session, done = brand, the rest faint;
    the big number is the percentage, the small uppercase line says what is being counted.
    Letter-spacing only for Latin labels: tracking splits Devanagari conjuncts apart. */
export function SegmentedRing({ done, total, size = 190, stroke = 11, label }:
  { done: number; total: number; size?: number; stroke?: number; label: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = total > 1 ? Math.min(8, (c / total) * 0.3) : 0;
  const seg = Math.max(2, c / Math.max(1, total) - gap);
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <svg className="lrn-segring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${done} / ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <circle key={i} className="lrn-segring__seg" cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={i < done ? "var(--brand)" : "var(--line-2)"} strokeOpacity={i < done ? 1 : 0.45}
          strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${seg} ${c - seg}`}
          transform={`rotate(${-90 + (360 / total) * i} ${size / 2} ${size / 2})`} />
      ))}
      <text x="50%" y="47%" dominantBaseline="central" textAnchor="middle" fill="var(--ink)"
        fontSize={size * 0.24} fontWeight={700} style={{ fontVariantNumeric: "tabular-nums" }}>{pct}%</text>
      <text x="50%" y="63%" dominantBaseline="central" textAnchor="middle" fill="var(--ink-3)"
        fontSize={size * 0.058} fontWeight={600} letterSpacing={/^[ -~]*$/.test(label) ? "0.12em" : 0} style={{ textTransform: "uppercase" }}>
        {label}
      </text>
    </svg>
  );
}

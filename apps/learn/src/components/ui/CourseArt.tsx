import * as React from "react";
import { CandlestickChart, Target, Shield, BookOpen, type IconProps } from "./Icon";

/* Cover art in the Winners MOD_ART shape — a lookup of id: [icon, '#hex'] with a
   deterministic fallback, because sessions have no cover art of their own. Tints come
   from the same --c1..--c5 / sky-indigo-teal family Winners uses, so the two
   courses read as one product. Presentation only: nothing here touches content. */
type Art = [React.ComponentType<IconProps>, string];

const WEEK_ICON: Record<string, React.ComponentType<IconProps>> = {
  "foundation-w1": CandlestickChart,
  "foundation-w2": Target,
  "foundation-w3": Shield,
};

/* Same fallback recipe as Winners' modArt(): 5-colour cycle keyed on number.
   Each session cycles the family (Winners gives every module its own tint). */
const CYCLE = ["#22d3ee", "#2dd4bf", "#38bdf8", "#818cf8", "#f5a524"];
export function courseArt(level: string, week: number, n = week): Art {
  return [WEEK_ICON[`${level}-w${week}`] ?? BookOpen, CYCLE[n % CYCLE.length]];
}

/** Full-bleed icon/tint cover with the big module number (live Winners module-card recipe). */
export function Cover({ level, week, n, size = 30 }: { level: string; week: number; n?: number; size?: number }) {
  const [Glyph, tint] = courseArt(level, week, n ?? week);
  return (
    <div className="lrn-cover" aria-hidden>
      <div className="lrn-cover__tint" style={{ background: `linear-gradient(135deg, ${tint}b8, ${tint}2e 70%, transparent)` }} />
      <Glyph size={size} strokeWidth={1.5} />
      {n != null && <span className="lrn-cover__num">{String(n).padStart(2, "0")}</span>}
    </div>
  );
}

/* Decorative five-ring art behind the access gate — geometry ported 1:1 from
   Winners' ringsArt() (app.js lines 986–996): same radii, colours, opacities,
   dash fractions and rotations, as JSX instead of an HTML string. */
const RING_COLORS = ["#22d3ee", "#22b8f5", "#38bdf8", "#818cf8", "#f5a524"];
export function RingsArt() {
  return (
    <svg viewBox="0 0 500 500" aria-hidden>
      <defs>
        <radialGradient id="gglow" cx="50%" cy="50%">
          <stop offset="0" stopColor="#00aeef" stopOpacity=".2" />
          <stop offset="1" stopColor="#00aeef" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="250" cy="250" r="245" fill="url(#gglow)" />
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

/** Segmented progress ring, Winners hero-panel style: chunky rounded segments,
    done = brand, remainder faint; big % with an uppercase label under it. */
export function SegmentedRing({ done, total, size = 190, stroke = 11, label }:
  { done: number; total: number; size?: number; stroke?: number; label: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = total > 1 ? Math.min(8, (c / total) * 0.3) : 0;
  const seg = Math.max(2, c / total - gap);
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
        fontSize={size * 0.058} fontWeight={600} letterSpacing="0.12em" style={{ textTransform: "uppercase" }}>
        {label}
      </text>
    </svg>
  );
}

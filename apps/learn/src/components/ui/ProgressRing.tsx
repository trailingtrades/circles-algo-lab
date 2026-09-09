"use client";
import * as React from "react";

/** SVG completion ring. Animates once on mount, honours prefers-reduced-motion via CSS. */
export function ProgressRing({ value, size = 56, stroke = 5, label }: { value: number; size?: number; stroke?: number; label: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const [offset, setOffset] = React.useState(c);
  React.useEffect(() => { const id = requestAnimationFrame(() => setOffset(c - (clamped / 100) * c)); return () => cancelAnimationFrame(id); }, [c, clamped]);
  return (
    <svg className="lrn-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${clamped}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={stroke} />
      <circle className="lrn-ring__arc" cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--col-brand)" strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="currentColor" fontFamily="var(--col-font-mono)" fontSize={size * 0.24} fontWeight={600}>{clamped}</text>
    </svg>
  );
}

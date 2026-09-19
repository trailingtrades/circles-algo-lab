import { tr, type Lang, type L } from "@/lib/i18n/lang";
import type { Visual as V, FlowV, StepsV, CompareV, CalcV, BarsV, LineV, CandlesV, MindmapV, StoryV } from "@/lib/content/visuals";
import { VL, CHAR, toneFill, toneText } from "./labels";
import { Avatar } from "./Avatar";

/* Renderers for teaching visuals (spec: lib/content/visuals.ts). No hooks, no client JS:
   usable from server and client components alike. Text kinds are HTML so Hindi and
   Hinglish wrap; charts are SVG with short labels. Styles: styles/visuals.css. */

function Frame({ title, caption, lang, chart, kind, children }: { title?: L; caption?: L; lang: Lang; chart?: boolean; kind: string; children: React.ReactNode }) {
  return (
    <figure className={`vz vz--${kind}`}>
      {(title || chart) && (
        <div className="vz__head">
          {title && <span className="vz__title">{tr(title, lang)}</span>}
          {chart && <span className="vz__illus">{tr(VL.illustrative, lang)}</span>}
        </div>
      )}
      {children}
      {caption && <figcaption className="vz__cap">{tr(caption, lang)}</figcaption>}
    </figure>
  );
}

function Flow({ v, lang }: { v: FlowV; lang: Lang }) {
  return (
    <Frame kind="flow" title={v.title} caption={v.caption} lang={lang}>
      <ol className="vz-flow">
        {v.nodes.map((n, i) => (
          <li key={i} className="vz-flow__item">
            <div className="vz-flow__node" style={{ borderColor: toneFill(n.tone) }}>
              <span className="vz-flow__label">{tr(n.label, lang)}</span>
              {n.sub && <span className="vz-flow__sub">{tr(n.sub, lang)}</span>}
            </div>
            {i < v.nodes.length - 1 && (
              <span className="vz-flow__arrow" aria-hidden>
                <svg viewBox="0 0 24 24" width="20" height="20"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {v.arrows?.[i] && <span className="vz-flow__arrowlbl">{tr(v.arrows[i], lang)}</span>}
              </span>
            )}
          </li>
        ))}
      </ol>
    </Frame>
  );
}

function Steps({ v, lang }: { v: StepsV; lang: Lang }) {
  return (
    <Frame kind="steps" title={v.title} caption={v.caption} lang={lang}>
      <ol className="vz-steps">
        {v.items.map((s, i) => (
          <li key={i} className="vz-steps__item">
            <span className="vz-steps__dot" aria-hidden>{s.tag || i + 1}</span>
            <div><span className="vz-steps__label">{tr(s.label, lang)}</span>{s.sub && <span className="vz-steps__sub">{tr(s.sub, lang)}</span>}</div>
          </li>
        ))}
      </ol>
    </Frame>
  );
}

function Compare({ v, lang }: { v: CompareV; lang: Lang }) {
  return (
    <Frame kind="compare" title={v.title} caption={v.caption} lang={lang}>
      <div className="vz-compare" style={{ ["--vz-cols" as string]: String(v.cols.length) }}>
        {v.cols.map((c, i) => (
          <div key={i} className="vz-compare__col" style={{ borderTopColor: toneFill(c.tone) }}>
            <span className="vz-compare__head" style={{ color: toneText(c.tone) }}>{tr(c.head, lang)}</span>
            <ul>{c.points.map((p, j) => <li key={j}><span className="vz-dot" style={{ background: toneFill(c.tone) }} aria-hidden />{tr(p, lang)}</li>)}</ul>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function Calc({ v, lang }: { v: CalcV; lang: Lang }) {
  return (
    <Frame kind="calc" title={v.title} caption={v.caption} lang={lang}>
      <div className="vz-calc">
        {v.rows.map((r, i) => (
          <div key={i} className="vz-calc__row">
            <span className="vz-calc__op" aria-hidden>{r.op ?? ""}</span>
            <span className="vz-calc__label">{tr(r.label, lang)}</span>
            <span className="vz-calc__val">{r.value}</span>
          </div>
        ))}
        <div className="vz-calc__row vz-calc__row--result">
          <span className="vz-calc__op" aria-hidden>=</span>
          <span className="vz-calc__label">{tr(v.result.label, lang)}</span>
          <span className="vz-calc__val">{v.result.value}</span>
        </div>
      </div>
    </Frame>
  );
}

function Bars({ v, lang }: { v: BarsV; lang: Lang }) {
  const max = Math.max(...v.items.map((x) => Math.abs(x.value)), 1e-9);
  return (
    <Frame kind="bars" title={v.title} caption={v.caption} lang={lang}>
      <div className="vz-bars">
        {v.items.map((b, i) => (
          <div key={i} className="vz-bars__row">
            <span className="vz-bars__label">{tr(b.label, lang)}</span>
            <span className="vz-bars__track"><span className="vz-bars__fill" style={{ width: `${Math.max(2, (Math.abs(b.value) / max) * 100)}%`, background: toneFill(b.tone) }} /></span>
            <span className="vz-bars__val">{b.display ?? `${b.value}${v.unit ?? ""}`}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ---- SVG charts ---- */
const fmt = (n: number) => (Math.abs(n) >= 1000 ? Math.round(n).toLocaleString("en-IN") : Number.isInteger(n) ? String(n) : n.toFixed(Math.abs(n) < 10 ? 2 : 1));
function scale(min: number, max: number, top: number, bottom: number) {
  const span = max - min || 1;
  return (y: number) => bottom - ((y - min) / span) * (bottom - top);
}

function Line({ v, lang }: { v: LineV; lang: Lang }) {
  const W = 600, H = 260, P = { l: 52, r: 16, t: 16, b: v.x_label ? 40 : 26 };
  const all = v.series.flatMap((s) => s.points);
  const lo = Math.min(...all), hi = Math.max(...all);
  const pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.1 || 1;
  const min = lo - pad, max = hi + pad;
  const n = Math.max(...v.series.map((s) => s.points.length));
  const x = (i: number) => P.l + (n <= 1 ? 0 : (i / (n - 1)) * (W - P.l - P.r));
  const y = scale(min, max, P.t, H - P.b);
  const ticks = [0, 1, 2, 3, 4].map((k) => min + ((max - min) * k) / 4);
  return (
    <Frame kind="line" title={v.title} caption={v.caption} lang={lang} chart>
      <svg className="vz-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={tr(v.title ?? v.series[0].name, lang)}>
        {ticks.map((t, i) => (
          <g key={i}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} className="vz-grid" /><text x={P.l - 6} y={y(t) + 4} textAnchor="end" className="vz-tick">{fmt(t)}</text></g>
        ))}
        {(v.marks ?? []).map((m, i) => (
          <g key={`m${i}`}><line x1={x(m.x)} x2={x(m.x)} y1={P.t} y2={H - P.b} className="vz-markline" /><text x={x(m.x) + 4} y={P.t + 12} className="vz-marktext">{tr(m.label, lang)}</text></g>
        ))}
        {v.series.map((s, i) => (
          <polyline key={i} fill="none" stroke={toneFill(s.tone ?? (i === 0 ? "brand" : i === 1 ? "down" : "gold"))} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
            points={s.points.map((p, k) => `${x(k).toFixed(1)},${y(p).toFixed(1)}`).join(" ")} />
        ))}
        {v.x_label && <text x={(P.l + W - P.r) / 2} y={H - 8} textAnchor="middle" className="vz-axis">{tr(v.x_label, lang)}</text>}
        {v.y_label && <text x={12} y={P.t + 2} className="vz-axis" transform={`rotate(-90 12 ${P.t + 2})`} textAnchor="end">{tr(v.y_label, lang)}</text>}
      </svg>
      {v.series.length > 1 && (
        <div className="vz-legend">
          {v.series.map((s, i) => <span key={i}><i style={{ background: toneFill(s.tone ?? (i === 0 ? "brand" : i === 1 ? "down" : "gold")) }} aria-hidden />{tr(s.name, lang)}</span>)}
        </div>
      )}
    </Frame>
  );
}

function Candles({ v, lang }: { v: CandlesV; lang: Lang }) {
  const bars = v.bars.filter((b) => Array.isArray(b) && b.length === 4 && b.every((n) => Number.isFinite(n)));
  if (!bars.length) return null;
  const anatomy = !!v.anatomy;
  const W = anatomy ? 520 : Math.max(420, bars.length * 16 + 150);
  const volH = v.volume?.length ? 44 : 0;
  const H = anatomy ? 300 : 260 + volH;
  const P = { l: anatomy ? 150 : 48, r: anatomy ? 150 : 100, t: 18, b: 18 + volH };
  const levelYs = (v.levels ?? []).map((l) => l.y);
  const lo = Math.min(...bars.map((b) => b[2]), ...levelYs), hi = Math.max(...bars.map((b) => b[1]), ...levelYs);
  const pad = (hi - lo) * 0.08 || 1;
  const y = scale(lo - pad, hi + pad, P.t, H - P.b);
  const step = (W - P.l - P.r) / bars.length;
  const cw = anatomy ? Math.min(46, step * 0.5) : Math.max(4, Math.min(14, step * 0.62));
  const cx = (i: number) => P.l + step * (i + 0.5);
  const up = (b: number[]) => b[3] >= b[0];
  const vmax = Math.max(...(v.volume ?? [1]), 1);
  const ticks = anatomy ? [] : [0, 1, 2, 3].map((k) => lo - pad + ((hi - lo + 2 * pad) * k) / 3);
  // Anatomy labels hang off the first candle: parts on the left, prices on the right.
  const a = bars[0];
  const ax = cx(0);
  return (
    <Frame kind="candles" title={v.title} caption={v.caption} lang={lang} chart>
      <svg className="vz-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={tr(v.title ?? VL.illustrative, lang)}>
        {ticks.map((t, i) => <g key={i}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} className="vz-grid" /><text x={P.l - 6} y={y(t) + 4} textAnchor="end" className="vz-tick">{fmt(t)}</text></g>)}
        {(v.levels ?? []).map((l, i) => (
          <g key={`l${i}`}>
            <line x1={P.l} x2={W - P.r + 4} y1={y(l.y)} y2={y(l.y)} stroke={toneFill(l.tone ?? "gold")} strokeWidth="1.6" strokeDasharray={l.dashed === false ? undefined : "6 4"} />
            <text x={W - P.r + 8} y={y(l.y) + 4} className="vz-leveltext" style={{ fill: toneText(l.tone ?? "gold") }}>{tr(l.label, lang)}</text>
          </g>
        ))}
        {bars.map((b, i) => {
          const [o, h, l, c] = b; const col = up(b) ? "var(--bull)" : "var(--bear)";
          const top = y(Math.max(o, c)), bot = y(Math.min(o, c));
          return (
            <g key={i}>
              <line x1={cx(i)} x2={cx(i)} y1={y(h)} y2={y(l)} stroke={col} strokeWidth={anatomy ? 3 : 1.4} />
              <rect x={cx(i) - cw / 2} y={top} width={cw} height={Math.max(1.5, bot - top)} fill={col} rx={anatomy ? 3 : 1} />
              {v.volume?.[i] != null && <rect x={cx(i) - cw / 2} y={H - 10 - (v.volume[i] / vmax) * (volH - 8)} width={cw} height={(v.volume[i] / vmax) * (volH - 8)} fill={col} opacity=".45" />}
            </g>
          );
        })}
        {(v.marks ?? []).filter((m) => bars[m.i]).map((m, i) => {
          const b = bars[m.i]; const below = m.at === "low";
          const py = below ? y(b[2]) + 16 : y(b[1]) - 10;
          return (
            <g key={`m${i}`}>
              <path d={below ? `M${cx(m.i)} ${y(b[2]) + 3} l-4 6 h8 z` : `M${cx(m.i)} ${y(b[1]) - 3} l-4 -6 h8 z`} fill={toneFill(m.tone)} />
              <text x={cx(m.i)} y={below ? py + 8 : py - 4} textAnchor="middle" className="vz-marktext" style={{ fill: toneText(m.tone) }}>{tr(m.label, lang)}</text>
            </g>
          );
        })}
        {v.volume?.length ? <text x={P.l} y={H - 2} className="vz-tick">{tr(VL.volume, lang)}</text> : null}
        {anatomy && (
          <g className="vz-anat">
            {[
              [a[1], VL.high, "r"], [Math.max(a[0], a[3]), up(a) ? VL.close : VL.open, "r"], [Math.min(a[0], a[3]), up(a) ? VL.open : VL.close, "r"], [a[2], VL.low, "r"],
              [(a[1] + Math.max(a[0], a[3])) / 2, VL.upperWick, "l"], [(a[0] + a[3]) / 2, VL.body, "l"], [(a[2] + Math.min(a[0], a[3])) / 2, VL.lowerWick, "l"],
            ].map(([py, lbl, side], i) => {
              const yy = y(py as number); const right = side === "r";
              const x2 = right ? ax + cw / 2 + 60 : ax - cw / 2 - 60;
              return (
                <g key={i}>
                  <line x1={right ? ax + cw / 2 + 4 : ax - cw / 2 - 4} x2={x2} y1={yy} y2={yy} className="vz-leader" />
                  <text x={right ? x2 + 6 : x2 - 6} y={yy + 4} textAnchor={right ? "start" : "end"} className="vz-anattext">{tr(lbl as L, lang)}{right ? ` ${fmt(py as number)}` : ""}</text>
                </g>
              );
            })}
          </g>
        )}
      </svg>
      {anatomy && <p className="vz-note">{tr(up(a) ? VL.bullish : VL.bearish, lang)}</p>}
    </Frame>
  );
}

function Mindmap({ v, lang }: { v: MindmapV; lang: Lang }) {
  const half = Math.ceil(v.branches.length / 2);
  const side = (arr: MindmapV["branches"], dir: "l" | "r") => (
    <div className={`vz-mind__side vz-mind__side--${dir}`}>
      {arr.map((b, i) => (
        <div key={i} className="vz-mind__branch" style={{ borderColor: toneFill(b.tone) }}>
          <span className="vz-mind__label" style={{ color: toneText(b.tone) }}>{tr(b.label, lang)}</span>
          <ul>{b.points.map((p, j) => <li key={j}>{tr(p, lang)}</li>)}</ul>
        </div>
      ))}
    </div>
  );
  return (
    <Frame kind="mindmap" title={VL.recap} lang={lang}>
      <div className="vz-mind">
        {side(v.branches.slice(0, half), "l")}
        <div className="vz-mind__center"><span>{tr(v.center, lang)}</span></div>
        {side(v.branches.slice(half), "r")}
      </div>
    </Frame>
  );
}

function Story({ v, lang }: { v: StoryV; lang: Lang }) {
  return (
    <Frame kind="story" title={v.title} lang={lang}>
      <ol className="vz-story">
        {v.panels.map((p, i) => p.who === "narrator" ? (
          <li key={i} className="vz-story__panel vz-story__panel--narr"><p>{tr(p.say, lang)}</p></li>
        ) : (
          <li key={i} className={`vz-story__panel vz-story__panel--${p.who}`}>
            <Avatar who={p.who} mood={p.mood} />
            <div className="vz-story__bubble">
              <span className="vz-story__name" style={{ color: CHAR[p.who].hue }}>{tr(CHAR[p.who].name, lang)}</span>
              <p>{tr(p.say, lang)}</p>
            </div>
          </li>
        ))}
      </ol>
      {v.moral && <p className="vz-story__moral"><strong>{tr(VL.lesson, lang)}:</strong> {tr(v.moral, lang)}</p>}
    </Frame>
  );
}

/** Draws any teaching visual. Unknown or malformed specs render nothing rather than breaking the lesson: each
 *  kind is drawn only when the fields it needs are there. (A try/catch here never caught anything: React
 *  renders the returned element later, outside this function.) */
export function Visual({ v, lang }: { v: V | null | undefined; lang: Lang }) {
  if (!v || typeof v !== "object") return null;
  switch (v.kind) {
    case "flow": return v.nodes?.length ? <Flow v={v} lang={lang} /> : null;
    case "steps": return v.items?.length ? <Steps v={v} lang={lang} /> : null;
    case "compare": return v.cols?.length ? <Compare v={v} lang={lang} /> : null;
    case "calc": return v.rows && v.result ? <Calc v={v} lang={lang} /> : null;
    case "bars": return v.items?.length ? <Bars v={v} lang={lang} /> : null;
    case "line": return v.series?.length && v.series.every((s) => s.points?.length) ? <Line v={v} lang={lang} /> : null;
    case "candles": return v.bars?.length ? <Candles v={v} lang={lang} /> : null;
    case "mindmap": return v.branches?.length ? <Mindmap v={v} lang={lang} /> : null;
    case "story": return v.panels?.length ? <Story v={v} lang={lang} /> : null;
    default: return null;
  }
}

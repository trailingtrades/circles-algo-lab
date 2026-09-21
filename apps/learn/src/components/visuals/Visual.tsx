import { tr, type Lang, type L } from "@/lib/i18n/lang";
import type { Visual as V, FlowV, StepsV, CompareV, CalcV, BarsV, LineV, CandlesV, MindmapV, StoryV, TableV, Cell } from "@/lib/content/visuals";
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
            {/* the list already announces the step number; a tag (a time, a day) is content */}
            <span className="vz-steps__dot" aria-hidden={s.tag ? undefined : true}>{s.tag || i + 1}</span>
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

/* ---- SVG charts ----
   SVG text is sized in viewBox units, so it shrinks with the drawing: a 600-wide chart squeezed into a phone card
   set its 11px ticks at 5px. So each chart is laid out twice, at phone width (SM.W) and wide, and visuals.css shows
   one by the chart's container width (CHART_BP). visuals.css also multiplies chart text by --vz-k, the viewBox
   width over the drawn width clamped to 1..k, which keeps the text at its CSS px size while the drawing is scaled
   down. Gutters and label bands are sized here for the text at that largest scale, k. */
const CHART_BP = 480; // px of chart width below which the phone layout shows (the @container rule in visuals.css)
const SM = { W: 300, k: 1.15 }; // phone layout: text keeps its full size down to 300 / 1.15 = 261px of chart width
const FS = { tick: 11, axis: 12, mark: 12, level: 12, anat: 13 }; // px; must match the font sizes in visuals.css
const ASC = 1.18, DESC = 0.34; // a line of text's box above and below its baseline, in em (Devanagari runs tall)
const lineH = (fs: number) => fs * (ASC + DESC);
const kFor = (W: number, sm: boolean) => (sm ? SM.k : Math.max(1, Math.ceil((W / CHART_BP) * 100) / 100));
const up = (b: number[]) => b[3] >= b[0];
const seriesTone = (tone: LineV["series"][number]["tone"], i: number) => toneFill(tone ?? (i === 0 ? "brand" : i === 1 ? "down" : "gold"));

/** Advance width of a label in em, estimated on the wide side (IBM Plex Sans 600; Devanagari from the system face).
 *  It sizes the room kept for chart text, so erring narrow would clip a label. */
function em(s: string) {
  let w = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    if (c >= 0x900 && c <= 0x97f) w += (c >= 0x93e && c <= 0x940) || (c >= 0x949 && c <= 0x94c) ? 0.38 : c <= 0x903 || (c >= 0x93a && c <= 0x94f) || (c >= 0x951 && c <= 0x957) || c === 0x962 || c === 0x963 ? 0.06 : 0.74;
    else w += " ,.:;()'|-".includes(ch) ? 0.32 : /[A-Z0-9%+=]/.test(ch) ? 0.7 : 0.58;
  }
  return w;
}
const fmt = (n: number) => (Math.abs(n) >= 1000 ? Math.round(n).toLocaleString("en-IN") : Number.isInteger(n) ? String(n) : n.toFixed(Math.abs(n) < 10 ? 2 : 1));
function scale(min: number, max: number, top: number, bottom: number) {
  const span = max - min || 1;
  return (y: number) => bottom - ((y - min) / span) * (bottom - top);
}

function ChartSvg({ W, H, k, sm, label, children }: { W: number; H: number; k: number; sm: boolean; label: string; children: React.ReactNode }) {
  return (
    <svg className={`vz-svg vz-svg--${sm ? "sm" : "lg"}`} viewBox={`0 0 ${W} ${Math.ceil(H)}`} role="img" aria-label={label}
      style={{ ["--vz-w" as string]: `${W}px`, ["--vz-kmax" as string]: String(k) }}>
      {children}
    </svg>
  );
}

function LineSvg({ v, lang, sm }: { v: LineV; lang: Lang; sm: boolean }) {
  const W = sm ? SM.W : 600, k = kFor(W, sm), plotH = sm ? 170 : 204;
  const tick = FS.tick * k, axis = FS.axis * k, mark = FS.mark * k;
  const all = v.series.flatMap((s) => s.points);
  const lo = Math.min(...all), hi = Math.max(...all);
  const pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.1 || 1;
  const min = lo - pad, max = hi + pad;
  const n = Math.max(...v.series.map((s) => s.points.length));
  const ticks = [0, 1, 2, 3, 4].map((i) => min + ((max - min) * i) / 4);
  const xl = v.x_label ? tr(v.x_label, lang) : "", yl = v.y_label ? tr(v.y_label, lang) : "";
  // Left gutter: the tick labels, and the y title turned on its side (the phone layout prints it above the plot).
  const l = Math.ceil((yl && !sm ? lineH(axis) + 4 : 2) + Math.max(...ticks.map((t) => fmt(t).length)) * 0.62 * tick + 6);
  const r = sm ? 10 : 16;
  const x = (i: number) => l + (n <= 1 ? 0 : (i / (n - 1)) * (W - l - r));
  // Marks sit in rows above the plot beside their line, flipped to its left near the right edge, and a row lower
  // wherever they would run into an earlier mark.
  const rows: [number, number][][] = [];
  const marks = (v.marks ?? []).filter((m) => Number.isFinite(m.x)).map((m) => {
    const text = tr(m.label, lang), mx = x(m.x), w = em(text) * mark;
    let tx = mx + 4, anchor: "start" | "end" = "start";
    if (tx + w > W - 2) {
      if (mx - 4 - w >= 2) { tx = mx - 4; anchor = "end"; } else tx = Math.max(2, W - 2 - w);
    }
    const x0 = anchor === "end" ? tx - w : tx;
    let row = 0;
    while ((rows[row] ??= []).some(([a, b]) => x0 < b + 6 && x0 + w > a - 6)) row++;
    rows[row].push([x0, x0 + w]);
    return { text, mx, tx, anchor, row };
  });
  const title = sm && yl ? lineH(axis) + 4 : 0, rowH = lineH(mark) + 2;
  const t = Math.max(title + rows.length * rowH + (rows.length ? 4 : 0), (ASC - 0.35) * tick + 2);
  const H = t + plotH + (xl ? lineH(axis) + 8 : 10);
  const y = scale(min, max, t, t + plotH);
  const yx = ASC * axis + 1, ym = t + plotH / 2;
  return (
    <ChartSvg W={W} H={H} k={k} sm={sm} label={tr(v.title ?? v.series[0].name, lang)}>
      {ticks.map((tv, i) => (
        <g key={i}><line x1={l} x2={W - r} y1={y(tv)} y2={y(tv)} className="vz-grid" /><text x={l - 6} y={y(tv) + 0.35 * tick} textAnchor="end" className="vz-tick">{fmt(tv)}</text></g>
      ))}
      {marks.map((m, i) => (
        <g key={`m${i}`}><line x1={m.mx} x2={m.mx} y1={title + m.row * rowH} y2={t + plotH} className="vz-markline" /><text x={m.tx} y={title + m.row * rowH + ASC * mark} textAnchor={m.anchor} className="vz-marktext">{m.text}</text></g>
      ))}
      {v.series.map((s, i) => (
        <polyline key={i} fill="none" stroke={seriesTone(s.tone, i)} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
          points={s.points.map((p, j) => `${x(j).toFixed(1)},${y(p).toFixed(1)}`).join(" ")} />
      ))}
      {xl && <text x={(l + W - r) / 2} y={H - DESC * axis - 3} textAnchor="middle" className="vz-axis">{xl}</text>}
      {yl && (sm
        ? <text x={2} y={ASC * axis} className="vz-axis">{yl}</text>
        : <text x={yx} y={ym} transform={`rotate(-90 ${yx} ${ym})`} textAnchor="middle" className="vz-axis">{yl}</text>)}
    </ChartSvg>
  );
}

function Line({ v, lang }: { v: LineV; lang: Lang }) {
  return (
    <Frame kind="line" title={v.title} caption={v.caption} lang={lang} chart>
      <LineSvg v={v} lang={lang} sm={false} />
      <LineSvg v={v} lang={lang} sm />
      {v.series.length > 1 && (
        <div className="vz-legend">
          {v.series.map((s, i) => <span key={i}><i style={{ background: seriesTone(s.tone, i) }} aria-hidden />{tr(s.name, lang)}</span>)}
        </div>
      )}
    </Frame>
  );
}

function CandleSvg({ v, bars, lang, sm }: { v: CandlesV; bars: CandlesV["bars"]; lang: Lang; sm: boolean }) {
  const anatomy = !!v.anatomy;
  const W = sm ? SM.W : anatomy ? 520 : Math.max(420, bars.length * 16 + 150);
  const k = kFor(W, sm);
  const tick = FS.tick * k, lvl = FS.level * k, mk = FS.mark * k, an = FS.anat * k;
  const volH = v.volume?.length ? (sm ? 36 : 44) : 0;
  const plotH = anatomy ? (sm ? 230 : 264) : sm ? 180 : 214;
  const levels = (v.levels ?? []).map((lv) => ({ ...lv, text: tr(lv.label, lang) }));
  const lo = Math.min(...bars.map((b) => b[2]), ...levels.map((lv) => lv.y)), hi = Math.max(...bars.map((b) => b[1]), ...levels.map((lv) => lv.y));
  const pad = (hi - lo) * 0.08 || 1;
  const ticks = anatomy ? [] : [0, 1, 2, 3].map((i) => lo - pad + ((hi - lo + 2 * pad) * i) / 3);
  const volLabel = volH ? tr(VL.volume, lang) : "";
  // Gutters: tick and volume labels on the left, level labels on the right (together at most 65% of the width);
  // the anatomy view keeps both sides for its part labels.
  const l = anatomy ? (sm ? 110 : 150) : Math.ceil(Math.max(...ticks.map((t) => fmt(t).length * 0.62), volLabel.length * 0.62, em(volLabel)) * tick + 10);
  const r = anatomy ? l : Math.min(levels.length ? Math.ceil(Math.max(...levels.map((lv) => em(lv.text))) * lvl + 14) : 12, Math.max(12, W * 0.65 - l));
  const step = (W - l - r) / bars.length;
  const cw = anatomy ? Math.min(sm ? 28 : 46, step * 0.5) : Math.max(Math.min(4, step * 0.8), Math.min(14, step * 0.62));
  const cx = (i: number) => l + step * (i + 0.5);
  const yr = scale(lo - pad, hi + pad, 0, plotH); // measured from the plot's top edge, which is drawn at y = t
  // Marks: centred on their candle but kept between the tick labels and the level labels (a label too wide for
  // that gives up the level side first, then the tick side, never the chart's edges), and stepped further out
  // (up for a high, down for a low) while they would overlap an earlier mark.
  const boxes: number[][] = [];
  const marks = (v.marks ?? []).filter((m) => bars[m.i]).map((m) => {
    const b = bars[m.i], below = m.at === "low", text = tr(m.label, lang), w = em(text) * mk;
    const inL = l - 2 + w / 2, inR = Math.max(W - Math.max(r - 4, 2) - w / 2, Math.min(inL, W - 2 - w / 2));
    const tx = Math.max(Math.min(Math.max(cx(m.i), inL), inR), w / 2 + 2);
    let base = below ? yr(b[2]) + 11 + ASC * mk : yr(b[1]) - 11 - DESC * mk;
    const hit = () => boxes.find(([x0, x1, y0, y1]) => tx - w / 2 < x1 + 3 && tx + w / 2 > x0 - 3 && base - ASC * mk < y1 && base + DESC * mk > y0);
    for (let n = 0, o = hit(); o && n < 6; n++, o = hit()) base = below ? o[3] + ASC * mk : o[2] - DESC * mk;
    boxes.push([tx - w / 2, tx + w / 2, base - ASC * mk, base + DESC * mk]);
    return { i: m.i, b, below, text, tone: m.tone, tx, base };
  });
  // Level labels sit beside their line in the right gutter, pushed apart where two levels are close.
  const lv = levels.map((x) => ({ ...x, ly: yr(x.y), ty: 0 })).sort((a, b) => a.ly - b.ly);
  lv.forEach((x, i) => { x.ty = Math.max(x.ly + 0.35 * lvl, i ? lv[i - 1].ty + 1.2 * lvl : -Infinity); });
  // Anatomy labels hang off the first candle: parts on the left, prices on the right.
  const a = bars[0], ax = cx(0);
  const anat = anatomy ? ([
    [a[1], VL.high, true], [Math.max(a[0], a[3]), up(a) ? VL.close : VL.open, true], [Math.min(a[0], a[3]), up(a) ? VL.open : VL.close, true], [a[2], VL.low, true],
    [(a[1] + Math.max(a[0], a[3])) / 2, VL.upperWick, false], [(a[0] + a[3]) / 2, VL.body, false], [(a[2] + Math.min(a[0], a[3])) / 2, VL.lowerWick, false],
  ] as [number, L, boolean][]).map(([py, lbl, right]) => ({ py, right, text: right ? `${tr(lbl, lang)} ${fmt(py)}` : tr(lbl, lang) })) : [];
  const sideW = (right: boolean) => Math.max(0, ...anat.filter((x) => x.right === right).map((x) => em(x.text) * an));
  const lead = Math.min(60, Math.max(10, Math.min(ax - sideW(false), W - ax - sideW(true)) - cw / 2 - 10));
  // Vertical room: the plot sits between whatever text reaches above or below it.
  const fs0 = anatomy ? an : tick;
  const tops = [(0.35 - ASC) * fs0, ...boxes.map((bx) => bx[2]), ...lv.map((x) => x.ty - ASC * lvl)];
  const bots = [plotH + (0.35 + DESC) * fs0, ...boxes.map((bx) => bx[3]), ...lv.map((x) => x.ty + DESC * lvl)];
  const t = Math.ceil(2 - Math.min(...tops)), H = t + Math.max(...bots) + 4 + volH;
  const Y = (p: number) => t + yr(p);
  const vmax = Math.max(...(v.volume ?? [1]), 1);
  return (
    <ChartSvg W={W} H={H} k={k} sm={sm} label={tr(v.title ?? VL.illustrative, lang)}>
      {ticks.map((tv, i) => <g key={i}><line x1={l} x2={W - r} y1={Y(tv)} y2={Y(tv)} className="vz-grid" /><text x={l - 6} y={Y(tv) + 0.35 * tick} textAnchor="end" className="vz-tick">{fmt(tv)}</text></g>)}
      {lv.map((x, i) => (
        <g key={`l${i}`}>
          <line x1={l} x2={W - r + 4} y1={Y(x.y)} y2={Y(x.y)} stroke={toneFill(x.tone ?? "gold")} strokeWidth="1.6" strokeDasharray={x.dashed === false ? undefined : "6 4"} />
          <text x={W - r + 8} y={t + x.ty} className="vz-leveltext" style={{ fill: toneText(x.tone ?? "gold") }}>{x.text}</text>
        </g>
      ))}
      {bars.map((b, i) => {
        const [o, h, lw, c] = b; const col = up(b) ? "var(--bull)" : "var(--bear)";
        const top = Y(Math.max(o, c)), bot = Y(Math.min(o, c));
        const vh = v.volume?.[i] != null ? (v.volume[i] / vmax) * (volH - 10) : 0;
        return (
          <g key={i}>
            <line x1={cx(i)} x2={cx(i)} y1={Y(h)} y2={Y(lw)} stroke={col} strokeWidth={anatomy ? 3 : 1.4} />
            <rect x={cx(i) - cw / 2} y={top} width={cw} height={Math.max(1.5, bot - top)} fill={col} rx={anatomy ? 3 : 1} />
            {v.volume?.[i] != null && <rect x={cx(i) - cw / 2} y={H - 4 - vh} width={cw} height={vh} fill={col} opacity=".45" />}
          </g>
        );
      })}
      {marks.map((m, i) => (
        <g key={`m${i}`}>
          <path d={m.below ? `M${cx(m.i)} ${Y(m.b[2]) + 3} l-4 6 h8 z` : `M${cx(m.i)} ${Y(m.b[1]) - 3} l-4 -6 h8 z`} fill={toneFill(m.tone)} />
          <text x={m.tx} y={t + m.base} textAnchor="middle" className="vz-marktext" style={{ fill: toneText(m.tone) }}>{m.text}</text>
        </g>
      ))}
      {volH ? <text x={l - 6} y={H - volH / 2 + 0.35 * tick} textAnchor="end" className="vz-tick">{volLabel}</text> : null}
      {anatomy && (
        <g className="vz-anat">
          {anat.map((x, i) => {
            const yy = Y(x.py), s = x.right ? 1 : -1, x2 = ax + s * (cw / 2 + lead);
            return (
              <g key={i}>
                <line x1={ax + s * (cw / 2 + 4)} x2={x2} y1={yy} y2={yy} className="vz-leader" />
                <text x={x2 + s * 6} y={yy + 0.35 * an} textAnchor={x.right ? "start" : "end"} className="vz-anattext">{x.text}</text>
              </g>
            );
          })}
        </g>
      )}
    </ChartSvg>
  );
}

function Candles({ v, lang }: { v: CandlesV; lang: Lang }) {
  const bars = v.bars.filter((b) => Array.isArray(b) && b.length === 4 && b.every((n) => Number.isFinite(n)));
  if (!bars.length) return null;
  return (
    <Frame kind="candles" title={v.title} caption={v.caption} lang={lang} chart>
      <CandleSvg v={v} bars={bars} lang={lang} sm={false} />
      <CandleSvg v={v} bars={bars} lang={lang} sm />
      {v.anatomy && <p className="vz-note">{tr(up(bars[0]) ? VL.bullish : VL.bearish, lang)}</p>}
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

/** A ruled table. It scrolls sideways inside its card on a phone rather than widening the page (the wrapper is a
 *  focusable, named region so keyboard users can scroll it too; its name is the table's title, else the heading it
 *  sits under). Plain-string cells are numbers or symbols, set in tabular figures; blank_rows adds empty ruled rows
 *  to fill in, which is what makes a table a template. */
function Table({ v, lang, label }: { v: TableV; lang: Lang; label?: string }) {
  const blank = Math.max(0, Math.min(12, Math.floor(Number(v.blank_rows) || 0)));
  const cols = v.head.length;
  const cell = (c: Cell | undefined) => (c == null ? "" : typeof c === "string" ? c : tr(c, lang));
  return (
    <Frame kind="table" title={v.title} caption={v.caption} lang={lang}>
      <div className="vz-table__wrap" role="region" aria-label={v.title ? tr(v.title, lang) : label || tr(VL.table, lang)} tabIndex={0}>
        <table className="vz-table">
          <thead><tr>{v.head.map((h, j) => <th key={j} scope="col">{tr(h, lang)}</th>)}</tr></thead>
          <tbody>
            {(v.rows ?? []).map((r, i) => (
              <tr key={i}>{Array.from({ length: cols }, (_, j) => <td key={j} className={typeof r?.[j] === "string" ? "vz-table__num" : undefined}>{cell(r?.[j])}</td>)}</tr>
            ))}
            {Array.from({ length: blank }, (_, i) => (
              <tr key={`b${i}`} className="vz-table__blank">{Array.from({ length: cols }, (_, j) => <td key={j} />)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      {v.note && <p className="vz-note">{tr(v.note, lang)}</p>}
    </Frame>
  );
}

/** Draws any teaching visual. Unknown or malformed specs render nothing rather than breaking the lesson: each
 *  kind is drawn only when the fields it needs are there. (A try/catch here never caught anything: React
 *  renders the returned element later, outside this function.) `label` names a table's scroll region when the
 *  table has no title of its own (pass the heading it sits under). */
export function Visual({ v, lang, label }: { v: V | null | undefined; lang: Lang; label?: string }) {
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
    case "table": return v.head?.length && Array.isArray(v.rows) ? <Table v={v} lang={lang} label={label} /> : null;
    default: return null;
  }
}

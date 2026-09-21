/* Teaching visuals are DATA, not images: each lesson carries small JSON specs that
 * src/components/visuals/ draws on-brand, in both themes and in all three languages.
 * Authoring reference with examples: docs/SMART_CONTENT_SCHEMA.md.
 * Text-heavy kinds render as HTML (so Hindi/Hinglish wraps naturally); charts render
 * as SVG with short labels. Every number in a chart is ILLUSTRATIVE — the renderer
 * stamps "Illustrative" on candles/line charts so no one reads them as market data. */
import type { L } from "@/lib/i18n/lang";

export type Tone = "brand" | "up" | "down" | "gold" | "muted";

/** A left-to-right (vertical on phones) chain of boxes joined by arrows. e.g. You -> Broker -> Exchange -> Clearing -> Demat. 2-6 nodes. */
export interface FlowV { kind: "flow"; title?: L; caption?: L; nodes: { label: L; sub?: L; tone?: Tone }[]; arrows?: L[] /* optional label per arrow, length nodes-1 */ }
/** Numbered timeline. e.g. T day: trade -> T+1: shares in demat. 2-6 items; `tag` is a short badge like "T+1". */
export interface StepsV { kind: "steps"; title?: L; caption?: L; items: { label: L; sub?: L; tag?: string }[] }
/** 2-3 columns side by side. e.g. Trader vs Gambler; Fact / Guess / Kachra. 2-5 points per column. */
export interface CompareV { kind: "compare"; title?: L; caption?: L; cols: { head: L; tone?: Tone; points: L[] }[] }
/** A worked example, line by line, ending in a highlighted result. Values are pre-formatted strings ("Rs 1,00,000", "1%"). */
export interface CalcV { kind: "calc"; title?: L; caption?: L; rows: { label: L; value: string; op?: "+" | "-" | "x" | "÷" | "=" }[]; result: { label: L; value: string } }
/** Horizontal bars. `display` overrides the printed value ("42%"). 2-6 items. */
export interface BarsV { kind: "bars"; title?: L; caption?: L; unit?: string; items: { label: L; value: number; tone?: Tone; display?: string }[] }
/** 1-3 line series over the same x steps (e.g. equity after each of 30 trades). 5-60 points each. */
export interface LineV { kind: "line"; title?: L; caption?: L; x_label?: L; y_label?: L; series: { name: L; tone?: Tone; points: number[] }[]; marks?: { x: number; label: L }[] }
/** Candlestick chart. bars = [open, high, low, close]; 1-40 bars. `anatomy` labels the parts of ONE candle (use with 1-2 bars).
 *  levels = horizontal lines (support, resistance, stop-loss); marks = labels pinned to a bar (0-based index). */
export interface CandlesV {
  kind: "candles"; title?: L; caption?: L; bars: [number, number, number, number][];
  anatomy?: boolean; volume?: number[];
  levels?: { y: number; label: L; tone?: Tone; dashed?: boolean }[];
  marks?: { i: number; label: L; tone?: Tone; at?: "high" | "low" }[];
}
/** Session recap: one centre idea and 3-6 branches of 1-4 short points. */
export interface MindmapV { kind: "mindmap"; center: L; branches: { label: L; tone?: Tone; points: L[] }[] }
/** A short illustrated story (3-6 panels). The mentor is a calm senior teacher; Aman and Priya are beginners;
 *  the tipster is the WhatsApp-tip seller used only in scam stories; narrator is a caption box. */
export type Character = "mentor" | "aman" | "priya" | "tipster" | "narrator";
export type Mood = "neutral" | "happy" | "worried" | "thinking" | "sad" | "excited";
export interface StoryV { kind: "story"; title?: L; panels: { who: Character; say: L; mood?: Mood }[]; moral?: L }

/** A cell of a table: text in three languages, or a short plain string for numbers and symbols ("Rs 1,250", "-", "1.5R"). */
export type Cell = L | string;
/** A ruled table: a sample journal, a Risk Card, a backtest log. head = 2-6 columns; rows = 0-14 filled rows, one cell
 *  per column; blank_rows = 0-12 empty ruled rows for the learner to fill in (templates). Scrolls sideways on a phone. */
export interface TableV { kind: "table"; title?: L; caption?: L; head: L[]; rows: Cell[][]; blank_rows?: number; note?: L }

export type Visual = FlowV | StepsV | CompareV | CalcV | BarsV | LineV | CandlesV | MindmapV | StoryV | TableV;
export type VisualKind = Visual["kind"];
export const VISUAL_KINDS: readonly VisualKind[] = ["flow", "steps", "compare", "calc", "bars", "line", "candles", "mindmap", "story", "table"];

import { t3, type L } from "@/lib/i18n/lang";
import type { Character, Tone } from "@/lib/content/visuals";

/** Fixed words the renderers print themselves (content never has to supply these). */
export const VL = {
  illustrative: t3("Illustrative", "Sirf samjhane ke liye", "सिर्फ़ समझाने के लिए"),
  recap: t3("Recap", "Recap", "दोहराव"),
  lesson: t3("The lesson", "Seekh", "सीख"),
  result: t3("Result", "Result", "नतीजा"),
  high: t3("High", "High", "हाई"),
  low: t3("Low", "Low", "लो"),
  open: t3("Open", "Open", "ओपन"),
  close: t3("Close", "Close", "क्लोज़"),
  body: t3("Body", "Body", "बॉडी"),
  upperWick: t3("Upper wick", "Upper wick", "ऊपरी बत्ती"),
  lowerWick: t3("Lower wick", "Lower wick", "निचली बत्ती"),
  bullish: t3("Green candle: close above open", "Green candle: close, open se upar", "हरी कैंडल: क्लोज़, ओपन से ऊपर"),
  bearish: t3("Red candle: close below open", "Red candle: close, open se neeche", "लाल कैंडल: क्लोज़, ओपन से नीचे"),
  volume: t3("Volume", "Volume", "वॉल्यूम"),
} satisfies Record<string, L>;

/** `hue` is the speaker name's TEXT colour (12px bold on --panel-2), so it must clear AA on both themes:
 *  fill tokens (--c2, --c4, --bear, light --brand) do not. --who-* are theme-scoped in visuals.css. */
export const CHAR: Record<Character, { name: L; hue: string }> = {
  mentor: { name: t3("Mentor", "Mentor", "मेंटर"), hue: "var(--who-mentor)" },
  aman: { name: t3("Aman", "Aman", "अमन"), hue: "var(--who-aman)" },
  priya: { name: t3("Priya", "Priya", "प्रिया"), hue: "var(--who-priya)" },
  tipster: { name: t3("Tip-wala", "Tip-wala", "टिप-वाला"), hue: "var(--bear-text)" },
  narrator: { name: t3("Meanwhile", "Udhar", "उधर"), hue: "var(--ink-3)" },
};

/** Fill colour for a tone (bars, lines, candles, borders). */
export const toneFill = (t?: Tone) => (t === "up" ? "var(--bull)" : t === "down" ? "var(--bear)" : t === "gold" ? "var(--gold)" : t === "muted" ? "var(--ink-3)" : "var(--brand)");
/** Same tone as TEXT — the -text tokens clear AA on both themes. */
export const toneText = (t?: Tone) => (t === "up" ? "var(--bull-text)" : t === "down" ? "var(--bear-text)" : t === "gold" ? "var(--gold-text)" : t === "muted" ? "var(--ink-2)" : "var(--brand)");

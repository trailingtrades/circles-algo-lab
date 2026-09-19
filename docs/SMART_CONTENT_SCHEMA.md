# CIRCLE S.M.A.R.T — Stage 1 content: authoring format (v3 source, v2 content)

Source of truth for Stage 1 (Tier 1, 21 days): one JSON file per day in
`scripts/content_v3/smart/dayNN.json`, plus weekend banks `exam_w1.json`,
`exam_w2.json`, `exam_w3.json` and `exam_final.json`.
`python scripts/gen_content.py` validates everything, then writes `content/*.json`
(what the app and the DB seed read). Never hand-edit `content/*.json`.

Tier 2 / Tier 3 drafts still come from `scripts/content_v2/tier23.py`.

## Three languages — every learner-facing string is an `L`

```json
{ "en": "English", "hi": "Hinglish in Roman script", "dv": "हिंदी देवनागरी में" }
```

| key | language | rules |
|---|---|---|
| `en` | English | Plain, short sentences. Indian English. Money as `Rs 1,000` / `Rs 1 lakh`. |
| `hi` | Hinglish | Roman script ONLY (zero Devanagari characters). How a good Indian teacher actually talks: "Stop-loss ka matlab hai...". Trading terms stay English (stop-loss, candle, support, trend, order). |
| `dv` | हिंदी | Devanagari. Everyday Hindi of a finance teacher, not bookish/shuddh Hindi. Common trading terms written the way people say them: स्टॉप-लॉस, कैंडल, सपोर्ट, ट्रेंड, ब्रोकर. Acronyms and index names stay Latin: NSE, BSE, SEBI, NIFTY 50, RSI, EMA, VWAP, AI. Digits stay 0-9 (never ०-९). |

The app shows the language the learner picked in the header (EN / Hinglish / हिंदी)
and falls back dv -> hi -> en if a string is missing — so never leave one empty.

## Day file (`dayNN.json`)

```jsonc
{
  "day": 1,                                   // 1..21 (Day 7/14/21 are weekly review days)
  "title": L,
  "tags": { "concept": L, "ai_lab": L, "psychology": L },
  "strategy": null,                           // or a short English strategy name, e.g. "ORB"
  "duration_min": 60,
  "story": StoryV,                            // opening story, 3-6 panels
  "topics": [                                 // 4-6 topics
    { "h": L, "p": L,                         // heading + 3-6 short sentences
      "example": L,                           // optional: concrete Indian everyday example
      "remember": L,                          // optional: one-line takeaway
      "visual": Visual }                      // optional: at least 2 topics per day carry one
  ],
  "key_terms": [ { "term": L, "meaning": L } ],   // 3-6 new words of the day
  "mindmap": MindmapV,                        // recap at the end
  "kaam": L,                                  // one-line brief of today's task
  "kaam_steps": [L],                          // 3-6 checklist steps, each one action
  "kaam_min": 15,
  "outcome": L,                               // "By the end you can ..."
  "tools": [L],
  "fun": L,                                   // cohort activity, or null
  "compliance": "English, verbatim, or null",
  "prompts": [ { "title": L, "body": "English prompt" } ],  // AI Lab; body stays English (the app adds 'reply in Hinglish/Hindi')
  "journal_prompt": L,
  "motivation": L,                            // closing line: mature, process-first, never a promise
  "quiz": [                                   // exactly 5
    { "stem": L,
      "options": [ { "text": L, "correct": true }, { "text": L, "correct": false }, ... ],  // exactly 4, one correct
      "explanation": L }
  ]
}
```

Write the correct option in any position — the generator shuffles options with a fixed
seed so the right answer is spread across A/B/C/D.

Exam bank (`exam_wN.json`, `exam_final.json`):
`{ "week": 1 | null, "questions": [ quiz item, ... ] }` — 15 per weekend Quiz Game, 30 in the final.

## Visuals (`apps/learn/src/lib/content/visuals.ts`)

All numbers in charts are illustrative. Keep chart labels short (1-3 words).

| kind | use it for | shape |
|---|---|---|
| `flow` | a process chain | `{ kind, title?, caption?, nodes: [{label, sub?, tone?}] (2-6), arrows?: [L] }` |
| `steps` | a timeline / sequence | `{ kind, title?, caption?, items: [{label, sub?, tag?}] (2-6) }` — `tag` like `"T+1"` |
| `compare` | A vs B (vs C) | `{ kind, title?, caption?, cols: [{head, tone?, points: [L] (2-5)}] (2-3) }` |
| `calc` | a worked calculation | `{ kind, title?, caption?, rows: [{label, value, op?}], result: {label, value} }` — values are pre-formatted strings |
| `bars` | comparing sizes | `{ kind, title?, caption?, unit?, items: [{label, value, tone?, display?}] (2-6) }` |
| `line` | a curve over time | `{ kind, title?, caption?, x_label?, y_label?, series: [{name, tone?, points: [n] (5-60)}] (1-3), marks?: [{x, label}] }` |
| `candles` | price action | `{ kind, title?, caption?, bars: [[o,h,l,c]] (1-40), anatomy?, volume?, levels?: [{y, label, tone?, dashed?}], marks?: [{i, label, tone?, at?}] }` |
| `mindmap` | the day's recap | `{ kind, center: L, branches: [{label, tone?, points: [L] (1-4)}] (3-6) }` |
| `story` | the opening hook | `{ kind, title?, panels: [{who, say, mood?}] (3-6), moral? }` |

`tone`: `brand` | `up` (green) | `down` (red) | `gold` | `muted`.
Story characters (`who`): `mentor` (calm senior teacher), `aman`, `priya` (beginners),
`tipster` (the WhatsApp-tip seller — scam stories only), `narrator` (caption box).
`mood`: `neutral` | `happy` | `worried` | `thinking` | `sad` | `excited`.

## Non-negotiables the validator enforces

1. No promise language in any language — guaranteed, assured, sure-shot, pakka profit, no-loss,
   risk-free, 100% accurate, गारंटी, पक्का मुनाफा … Allowed ONLY inside a `story` panel spoken by
   `tipster` and inside wrong quiz options (that is how scams are taught).
2. The only F&O-loss statistic: "SEBI FY26 study (Aug 2026): 87.7% of individual F&O traders in net
   loss, aggregate Rs 91,685 cr, average Rs 1.17 lakh per loss-making trader" — always with its source.
3. Never print the repo rate, STT / brokerage / cost rates, or the RBI reference rate — tell learners
   to read their own contract note.
4. No real stock tips: examples use NIFTY 50 / BANKNIFTY or made-up names ("Sharma Textiles Ltd").
5. Virtual money only; Stage 1 places no F&O trades, not even paper ("F&O = samjho, khelo mat").
6. `hi` has zero Devanagari; `en` has zero Devanagari; `dv` is mostly Devanagari.
7. No emoji anywhere.

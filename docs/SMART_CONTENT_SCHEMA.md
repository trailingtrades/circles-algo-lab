# CIRCLE S.M.A.R.T — Stage 1 content: authoring format (v3 source, v2 content)

Source of truth for Stage 1 (Tier 1, 21 days): one JSON file per day in
`scripts/content_v3/smart/dayNN.json`, plus weekend banks `exam_w1.json`,
`exam_w2.json`, `exam_w3.json` and `exam_final.json`.
`python scripts/gen_content.py` validates everything, then writes `content/*.json`
(what the app and the DB seed read). Never hand-edit `content/*.json`.

Validate while you write (from the repo root; on Windows prefix `PYTHONIOENCODING=utf-8`):

```
python scripts/content_v3/build_smart.py day09.json      # one day
python scripts/content_v3/build_smart.py exam_w1.json    # one exam bank
python scripts/content_v3/build_smart.py                 # everything, as gen_content.py does
```

Single-file mode also checks that file's quiz stems against every other day quiz and exam bank.

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
  "strategy": null,                           // or L for a strategy day, e.g. {"en": "Opening Range Breakout (ORB)", ...}
  "duration_min": 60,
  "story": StoryV,                            // opening story, 3-6 panels
  "topics": [                                 // 4-6 topics
    { "h": L, "p": L,                         // heading + 3-6 short sentences
      "example": L,                           // optional: concrete Indian everyday example
      "remember": L,                          // optional: one-line takeaway
      "visual": Visual }                      // optional: at least 2 topics per day carry one
  ],
  "key_terms": [ { "term": L, "meaning": L } ],   // 3-8 new words of the day
  "mindmap": MindmapV,                        // recap at the end
  "kaam": L,                                  // one-line brief of today's task
  "kaam_steps": [L],                          // 3-6 checklist steps, each one action
  "kaam_min": 15,
  "artefacts": [                              // optional, 0-3: the templates / model cards today's task builds
    { "title": L, "note": L, "visual": Visual }   // note optional; visual is any kind except story and mindmap
  ],
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
`{ "week": 1 | null, "questions": [ quiz item, ... ] }` — 15 per weekend Quiz Game (`week` 1, 2, 3),
30 in the final (`week` null).

### Answer length: no "pick the longest / shortest" shortcut

The validator measures the ENGLISH text of the four options, in characters (after trimming spaces).
"Unique longest" means the correct option is longer than each of the other three; "unique shortest"
means it is shorter than each of them (a tie counts as neither).

| file | questions | correct option is the unique LONGEST in | correct option is the unique SHORTEST in |
|---|---|---|---|
| `dayNN.json` quiz | 5 | 1 or 2 questions | at most 1 question |
| `exam_w1/2/3.json` | 15 | 3 to 6 questions | at most 4 questions |
| `exam_final.json` | 30 | 6 to 12 questions | at most 8 questions |

How to fix a failing file without making it worse:
- Lengthen the right answer where the full truth needs the words ("Rs 1,250 — the 25% cap is smaller than the 1% rule's 2,500").
- Give distractors the same shape and detail as the right answer, so a learner has to think, not measure.
- Never pad with filler, and never make a wrong option obviously silly: every option must be a mistake a real beginner makes.
- The error names the question indexes that are unique longest / shortest today.

Every stem must be new: no two questions anywhere in the day quizzes and the four exam banks may share a stem
(compared in lower case with punctuation removed). Test the same idea with a new situation instead.

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
| `table` | a sample journal, a card, a log, a template to fill in | `{ kind, title?, caption?, head: [L] (2-6), rows: [[cell, ...]] (0-14), blank_rows?: 0-12, note?: L }` |

### `table`

```json
{ "kind": "table",
  "title":   { "en": "Priya's journal, first 3 trades", "hi": "Priya ka journal, pehle 3 trades", "dv": "प्रिया का जर्नल, पहले 3 ट्रेड" },
  "head": [ { "en": "Date", "hi": "Date", "dv": "तारीख़" },
            { "en": "Stock", "hi": "Stock", "dv": "स्टॉक" },
            { "en": "Result (R)", "hi": "Result (R)", "dv": "नतीजा (R)" },
            { "en": "Rule followed?", "hi": "Rule follow hua?", "dv": "नियम माना?" } ],
  "rows": [ [ "02-09", { "en": "Gupta Cement Ltd", "hi": "Gupta Cement Ltd", "dv": "Gupta Cement Ltd" }, "+1.8R", { "en": "Yes", "hi": "Haan", "dv": "हाँ" } ],
            [ "04-09", { "en": "Sharma Textiles Ltd", "hi": "Sharma Textiles Ltd", "dv": "Sharma Textiles Ltd" }, "-1.0R", { "en": "Yes", "hi": "Haan", "dv": "हाँ" } ] ],
  "blank_rows": 5,
  "note": { "en": "Copy the blank rows into your notebook or a Google Sheet.", "hi": "Khaali rows apni notebook ya Google Sheet mein copy kijiye.", "dv": "ख़ाली रो अपनी नोटबुक या Google Sheet में कॉपी कीजिए।" } }
```

- `head`: 2-6 column headings. `rows`: 0-14 rows, each with exactly one cell per heading.
- A cell is an `L`, or a plain string of at most 24 characters for numbers and symbols only
  (`"Rs 1,250"`, `"-"`, `"1.5R"`, `"9:15"`, `"02-09"`). A plain string prints the same in all three
  languages, so any lowercase word of 4+ letters (`"done"`, `"lakh"`, `"days"`) makes the validator ask
  for an `L`. `""` is an empty cell (a partly filled template row).
- `blank_rows`: 0-12 empty ruled rows for the learner to fill in. `rows` + `blank_rows` must be at least 1.
- `note`: one short line under the table (how to use it). `caption` is the usual figure caption.
- On a phone a wide table scrolls sideways inside its card; printed, it is light with every cell ruled and
  blank rows tall enough to write in. Keep headings short (1-3 words) so 4-6 columns still read well.

`tone`: `brand` | `up` (green) | `down` (red) | `gold` | `muted`.
Story characters (`who`): `mentor` (calm senior teacher), `aman`, `priya` (beginners),
`tipster` (the WhatsApp-tip seller — scam stories only), `narrator` (caption box).
`mood`: `neutral` | `happy` | `worried` | `thinking` | `sad` | `excited`.

## Templates and model cards (`artefacts`)

When the task asks a learner to BUILD something (a Risk Card, a rule card, a journal, a backtest log, a
calendar, a Routine Card ...), show a model of it in `artefacts`. The app draws them in the Today's task tab
under "Your template" / "Aapka template" / "आपका टेम्पलेट", after the checklist; the printed workbook is
built from the same data.

```json
"artefacts": [
  { "title": { "en": "Risk Card", "hi": "Risk Card", "dv": "रिस्क कार्ड" },
    "note":  { "en": "Fill it once; keep it next to your chart.", "hi": "Ek baar bhariye; chart ke paas rakhiye.", "dv": "एक बार भरिए; चार्ट के पास रखिए।" },
    "visual": { "kind": "table", "head": [ {"en": "Rule", "hi": "Rule", "dv": "नियम"}, {"en": "My number", "hi": "Mera number", "dv": "मेरा नंबर"} ],
                "rows": [ [ {"en": "Capital (virtual)", "hi": "Capital (virtual)", "dv": "कैपिटल (वर्चुअल)"}, "Rs 10,00,000" ],
                          [ {"en": "1R = 1% risk", "hi": "1R = 1% risk", "dv": "1R = 1% रिस्क"}, "Rs 10,000" ] ],
                "blank_rows": 4 } }
]
```

- 0-3 items per day. Fields: `title` (L, required), `note` (L, optional), `visual` (required). No other fields.
- `visual` may be any kind except `story` and `mindmap`: usually `table`; `compare`, `steps`, `flow`, `calc`
  also work. Leave `visual.title` out: the artefact `title` is the heading.
- A model card shows the house numbers (docs/SMART_COURSE_BIBLE.md) and made-up names only; a template
  uses `blank_rows` for the learner's own entries.
- The same compliance rules apply to every string (no promise words, no rates, no real stocks).

## Class files (`content/resources.json`)

Decks, handouts and workbooks are rows in `scripts/gen_content.py` (`STAGE1_V3_FILES` for the Stage 1 v3
files), not part of the day JSON:
`{ "level": "foundation", "week": 1-3, "day"?: 1-21, "lang"?: "en" | "hi", "kind": "deck" | "handout" | "workbook",
"file_name": "...", "note": "...", "storage_path": "https://..." or "/learn/..." }`.
One row per language copy: English readers get `en`, Hinglish and Hindi readers get `hi`, and a reader falls
back to whichever copy exists. `day` pins a file to one day (its week is filled in). A day lists its week's
(and its own) decks and handouts; attendance asks for "handout opened" only while one is listed.

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
8. No answer-length shortcut: see "Answer length" above (per day quiz, per weekly bank, final).
9. No repeated question stem across the 21 day quizzes and the four exam banks.
10. Counts: 4-6 topics (at least 2 with a visual), 3-8 key terms, 3-6 task steps, 0-3 artefacts, 1-3 prompts, 5 quiz questions.

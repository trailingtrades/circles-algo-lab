# Winners design reference — for a session that cannot read the local repo

Extracted verbatim from the live CIRCLE W.I.N.N.E.R.S build on 2026-09-16. Anything
building a new 5 Circles course surface should match these exactly.

| File | Extracted from | What it is |
|---|---|---|
| `tokens.css` | `tools/5circles-dashboard/src/template.html` lines 27–90 | the font-face + `:root` + `[data-theme=dark]` + `[data-theme=light]` blocks, **including the contrast comments** |
| `mod-art.js` | `tools/5circles-dashboard/src/app.js` lines 969–996 | `MOD_ART`, `modArt()` and `ringsArt()` |

## Three things a new surface gets wrong

**1. The dark tokens are NOT on `:root`.**
`:root` holds only what both themes share — semantic bull/bear/gold, the `--c1..--c5`
ring ramp, radii, fonts, spacing, easing. The grounds and inks live on
`[data-theme=dark]` and `[data-theme=light]`. `data-theme` is set on
`document.documentElement`, and **dark is the default** — there is no "no attribute"
state to fall back to, so stamp it on first paint or the page renders unstyled.

**2. Storage values are JSON-encoded, with a `5cd.` prefix.**

```js
var LS = '5cd.';
function save(k, v) { localStorage.setItem(LS + k, JSON.stringify(v)); }
function load(k, d) { var v = localStorage.getItem(LS + k); return v == null ? d : JSON.parse(v); }
```

So the theme key is **`5cd.theme`** and its value is **`"dark"` with the quotes** —
not `dark`. Same for **`5cd.lang`** (`"en"` / `"hg"` / `"hi"`). Write a bare string and
Winners' own `JSON.parse` throws, falls back to the default, and the student silently
loses their language when they move between surfaces. Read and write these two keys the
same way and all the surfaces on the host agree without a server.

Theme toggle, verbatim:

```js
S.theme = S.theme === 'dark' ? 'light' : 'dark';
save('theme', S.theme);
render();
document.documentElement.setAttribute('data-theme', S.theme);
```

**3. `MOD_ART` is a lookup, with a deterministic fallback.**
Modules have no cover art of their own — each card's icon and tint come from
`MOD_ART[m.id]`, and anything unmapped falls back to a `book` icon tinted from a
5-colour cycle keyed on `m.num`. A new course needs **its own map** in the same shape:
`id: ['icon-name', '#hex']`. Pick tints from the same family (`--c1..--c5` plus the
sky/indigo/teal range already in use) so the two courses read as one product.

## Contrast rules that are already encoded in the comments — do not "improve" them

- **Never white text on brand cyan.** `--brand` dark is `#22b8f5`; the thing that sits
  on it is `--brand-ink: #0b1b33`. White on cyan is 2.5:1. Light theme uses `#0b74b8`
  precisely because it is the one blue that clears 4.5:1 with white (4.6).
- `--ink-3` was raised in both themes to clear AA on the surfaces it is actually used
  on. Dark went `#64748b → #7c8ca3`; light went `#7c8fa1 → #57687a`. Do not darken them
  back.
- On light, bull/bear/gold **as text** are separate tokens (`--bull-text` etc.) because
  the fill colours fail AA on white — gold 2.04:1, green 3.30:1, red 3.43:1.
- The bias pills go one shade further again (`--pill-*`), measured on their own tint
  rather than on white.
- Gold is for achievement moments and badges only. The five ring colours run
  cyan → teal → sky → indigo, echoing the logo gradient.

## Fonts

IBM Plex Sans, variable 100–700, self-hosted at `/fonts/IBMPlexSans-var.woff2` on the
learn host. Do not add a CDN. Offline builds and artifacts have no `/fonts/` and fall
back to the system stack in `--ff`; nothing else depends on the file existing.
Devanagari uses `--ff-d` (Nirmala UI).

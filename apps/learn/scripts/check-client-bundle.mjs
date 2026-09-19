// Post-build gate: no quiz / exam answer key may reach a public browser chunk.
// Everything under .next/static is served without login (proxy.ts skips _next/static), so a bank that
// lands there hands every learner, and anyone with the URL, the answers. Matches the data form
// (`"correct_index":3`, `"distractor":false`), not code that merely reads t.correct_index (admin editor).
// Usage: node scripts/check-client-bundle.mjs [distDir]   (run after `next build`)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(process.argv[2] ?? ".next", "static");
const PATTERNS = [
  ["correct_index value", /["']?correct_index["']?\s*:\s*-?\d/g],
  ["distractor flag", /["']?distractor["']?\s*:\s*(?:true|false|!0|!1)/g],
  ["explanation text", /["']?explanation_(?:en|hi|dv)["']?\s*:\s*["'`]/g],
];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(js|mjs|json|txt)$/.test(name)) yield p;
  }
}

let bad = 0, scanned = 0;
try { statSync(root); } catch { console.error(`check-client-bundle: ${root} not found; run next build first`); process.exit(2); }
for (const f of files(root)) {
  scanned++;
  const src = readFileSync(f, "utf8");
  for (const [what, re] of PATTERNS) {
    const n = src.match(re)?.length ?? 0;
    if (n) { bad++; console.error(`LEAK ${f}: ${n} x ${what}`); }
  }
}
if (bad) { console.error(`check-client-bundle: answer-key data found in public chunks (${bad} hit${bad > 1 ? "s" : ""}). A "use client" file is importing lib/content/course.ts (directly or transitively).`); process.exit(1); }
console.log(`check-client-bundle: ${scanned} public files clean`);

/**
 * Stage 1 (CIRCLE S.M.A.R.T) week handouts as PDF, in English and Hinglish, printed by the app itself:
 *   apps/learn/files/stage1/CIRCLE-SMART_Week{1,2,3}_Handout_{EN,HINGLISH}.pdf  + manifest.json
 *
 * Same idea as scripts/build-preview.mjs: the app runs in DEMO mode (no Supabase, content from /content/*.json,
 * LOCAL_PREVIEW=1 so every day is open) and a headless browser opens /learn/print/week/<w>?lang=<en|hi>, then
 * page.pdf() writes A4 with backgrounds. The print route draws every visual with the app's own <Visual>, so the PDF
 * and the lesson on screen come from the same data (scripts/content_v3/smart/dayNN.json -> gen_content.py ->
 * content/*.json). No Devanagari edition (owner decision 21 Sep 2026): Hindi readers get the Hinglish copy.
 *
 * Order for a release: python scripts/gen_content.py  ->  node apps/learn/scripts/export-stage1.mjs  -> commit
 * content/ and apps/learn/files/stage1/ together. manifest.json records the sha256 of every dayNN.json used, so
 * scripts/ci/check_stage1_exports.py can warn when a day file changes after the export.
 *
 * Usage (from apps/learn or the repo root):
 *   node apps/learn/scripts/export-stage1.mjs [--skip-build] [--weeks 1,2,3] [--langs en,hi] [--port 3217] [--strict]
 *     --skip-build  reuse the last `next build` (only when content/ has not changed since that build)
 *     --strict      stop when content/ is behind the day files or the Stage 1 validator fails (default: warn)
 * Browser: Playwright's Chromium; if it is not installed, the installed Google Chrome (channel "chrome");
 * PW_CHROMIUM=<path> forces a binary. Never writes outside apps/learn/files/stage1/ (and .next/ when it builds).
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, "..");
const ROOT = join(APP, "..", "..");
const OUT = join(APP, "files", "stage1");
const DAYS = join(ROOT, "scripts", "content_v3", "smart");
const CONTENT = ["content/sessions/foundation.json", "content/quizzes/foundation.json"];
const EDITION = { en: "EN", hi: "HINGLISH" };
const NEXT_BIN = join(APP, "node_modules", "next", "dist", "bin", "next");
const TIER1 = readFileSync(join(ROOT, "scripts", "ci", "canonical", "tier1.txt"), "utf8");
const CRED = readFileSync(join(ROOT, "scripts", "ci", "canonical", "credential.txt"), "utf8");

// ---- arguments ----
const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const WEEKS = opt("--weeks", "1,2,3").split(",").map(Number).filter((w) => [1, 2, 3].includes(w));
const LANGS = opt("--langs", "en,hi").split(",").filter((l) => l in EDITION);
const PORT = Number(opt("--port", "3217"));
const BASE = `http://127.0.0.1:${PORT}`;
const STRICT = flag("--strict");
if (!WEEKS.length || !LANGS.length) { console.error("nothing to export: --weeks takes 1,2,3 and --langs takes en,hi"); process.exit(2); }

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const rel = (p) => p.slice(ROOT.length + 1).replace(/\\/g, "/");
const warn = (msg) => console.warn(`WARNING: ${msg}`);
const fail = (msg) => { console.error(`export-stage1: ${msg}`); process.exit(1); };
/** Canonical JSON (sorted keys), so two objects compare by content, not key order. */
const canon = (v) => JSON.stringify(v, (_, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x));

// ---- 1. demo mode only: a Supabase project would make the print route read the live DB (and need a sign-in) ----
const DEMO_BLOCK = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_BASE_PATH", "NEXT_OUTPUT_STANDALONE"];
for (const f of readdirSync(APP).filter((f) => f.startsWith(".env") && f !== ".env.example")) {
  if (/^\s*NEXT_PUBLIC_SUPABASE_URL\s*=\s*\S/m.test(readFileSync(join(APP, f), "utf8"))) fail(`apps/learn/${f} sets NEXT_PUBLIC_SUPABASE_URL; the export needs demo mode (content from /content JSON). Move that file aside and run again.`);
}
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
for (const k of DEMO_BLOCK) delete env[k];

// ---- 2. which day files, and is content/ generated from them? ----
const dayFiles = Array.from({ length: 21 }, (_, i) => `day${String(i + 1).padStart(2, "0")}.json`).filter((f) => existsSync(join(DAYS, f)));
if (dayFiles.length !== 21) fail(`scripts/content_v3/smart has ${dayFiles.length} of 21 day files`);
/** Text files hash with CRLF read as LF, so a Windows checkout (core.autocrlf) and CI agree. */
const textSha256 = (buf) => sha256(Buffer.from(buf.toString("latin1").replace(/\r\n/g, "\n"), "latin1"));
const dayHash = Object.fromEntries(dayFiles.map((f) => [f, textSha256(readFileSync(join(DAYS, f)))]));

function contentBehind() {
  const sessions = JSON.parse(readFileSync(join(ROOT, CONTENT[0]), "utf8"));
  const quizzes = JSON.parse(readFileSync(join(ROOT, CONTENT[1]), "utf8"));
  const behind = [];
  for (const f of dayFiles) {
    const d = JSON.parse(readFileSync(join(DAYS, f), "utf8"));
    const s = sessions.find((x) => x.level === "foundation" && x.number === d.day);
    const q = quizzes.find((x) => x.session === d.day);
    if (!s || !q) { behind.push(f); continue; }
    const c = s.content;
    const same = (a, b) => canon(a ?? null) === canon(b ?? null);
    const quizOf = (qs) => qs.map((x) => [x.stem.en, x.stem.hi, x.stem.dv, x.explanation.en, x.explanation.hi, x.explanation.dv, x.options.map((o) => o.text.en).sort()]);
    const quizNow = q.questions.map((x) => [x.stem_en, x.stem_hi, x.stem_dv, x.explanation_en, x.explanation_hi, x.explanation_dv, x.options.map((o) => o.en).sort()]);
    const ok = same([d.title.en, d.title.hi, d.title.dv], [s.title_en, s.title_hi, s.title_dv])
      && ["story", "topics", "key_terms", "mindmap", "kaam", "kaam_steps", "kaam_min", "outcome", "tools", "fun", "compliance", "journal_prompt", "motivation"].every((k) => same(d[k], c[k]))
      && same(d.artefacts?.length ? d.artefacts : null, c.artefacts?.length ? c.artefacts : null)
      && same(d.prompts.map((p) => [p.title, p.body]), s.prompts.map((p) => [p.title, p.body]))
      && same(quizOf(d.quiz), quizNow);
    if (!ok) behind.push(f);
  }
  return behind;
}
const behind = contentBehind();
if (behind.length) {
  const msg = `content/*.json is behind ${behind.length} day file(s) (${behind.join(", ")}): the PDFs show content/ as it is. Run python scripts/gen_content.py first.`;
  if (STRICT) fail(msg); else warn(msg);
}

function validator() {
  for (const py of [process.env.PYTHON, "python", "python3"].filter(Boolean)) {
    const r = spawnSync(py, [join(ROOT, "scripts", "content_v3", "build_smart.py")], { cwd: ROOT, env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONDONTWRITEBYTECODE: "1" }, encoding: "utf8" });
    if (r.error) continue;
    const last = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim().split(/\r?\n/).pop() ?? "";
    return r.status === 0 ? "ok" : `failed: ${last.slice(0, 300)}`;
  }
  return "skipped (no python)";
}
const validation = validator();
if (validation !== "ok") { const msg = `Stage 1 validator ${validation}`; if (STRICT && !validation.startsWith("skipped")) fail(msg); else warn(msg); }

// ---- 3. build (demo) and start the app ----
function run(args, extraEnv = {}) {
  const r = spawnSync(process.execPath, [NEXT_BIN, ...args], { cwd: APP, env: { ...env, ...extraEnv }, stdio: "inherit" });
  if (r.status !== 0) fail(`next ${args.join(" ")} exited with ${r.status}`);
}
if (!flag("--skip-build")) { console.log("building the app (demo mode) ..."); run(["build"]); }
else if (!existsSync(join(APP, ".next", "BUILD_ID"))) fail("--skip-build, but there is no build in apps/learn/.next");

try { await fetch(`${BASE}/learn`); fail(`port ${PORT} is already in use; pass --port <free port>`); } catch { /* free */ }
const server = spawn(process.execPath, [NEXT_BIN, "start", "-p", String(PORT), "-H", "127.0.0.1"], { cwd: APP, env: { ...env, LOCAL_PREVIEW: "1" }, stdio: ["ignore", "pipe", "pipe"] });
let serverLog = "";
server.stdout.on("data", (b) => { serverLog += b; });
server.stderr.on("data", (b) => { serverLog += b; });
const stop = () => { try { server.kill(); } catch { /* gone */ } };
process.on("exit", stop);
for (let i = 0; ; i++) {
  try { const r = await fetch(`${BASE}/learn`); if (r.status < 500) break; } catch { /* not up yet */ }
  if (i > 120 || server.exitCode != null) { console.error(serverLog.slice(-2000)); fail("the app did not start"); }
  await new Promise((r) => setTimeout(r, 500));
}
console.log(`app up at ${BASE} (demo mode, all days open)`);

// ---- 4. print ----
async function launch() {
  if (process.env.PW_CHROMIUM) return chromium.launch({ executablePath: process.env.PW_CHROMIUM });
  try { return await chromium.launch(); }
  catch { console.log("Playwright's Chromium is not installed here; using the installed Google Chrome"); return chromium.launch({ channel: "chrome" }); }
}
const pageCount = (buf) => (buf.toString("latin1").match(/\/Type\s*\/Page(?![a-zA-Z])/g) ?? []).length;

mkdirSync(OUT, { recursive: true });
const browser = await launch();
console.log(`browser: ${browser.version()}`);
const files = [];
try {
  for (const w of WEEKS) {
    for (const lang of LANGS) {
      const name = `CIRCLE-SMART_Week${w}_Handout_${EDITION[lang]}.pdf`;
      const url = `${BASE}/learn/print/week/${w}?lang=${lang}`;
      const ctx = await browser.newContext({ viewport: { width: 1200, height: 1700 }, colorScheme: "light", locale: "en-IN" });
      await ctx.addCookies([{ name: "5cd_lang", value: lang, url: BASE }]);
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      const res = await page.goto(url, { waitUntil: "load", timeout: 180000 });
      if (!res || !res.ok()) fail(`${url} answered ${res?.status()}`);
      await page.waitForSelector(".prt-doc[data-print-ready]", { timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
      // Checks on what is about to be printed: all 7 days, the disclaimer verbatim, the credential line, no lock.
      const facts = await page.evaluate(() => ({
        days: [...document.querySelectorAll(".prt-day")].map((d) => d.id),
        text: document.querySelector(".prt-doc")?.textContent ?? "",
        locked: !!document.querySelector(".lrn-card--locked"),
      }));
      if (facts.locked) fail(`${url}: the week is locked in the export app (LOCAL_PREVIEW should open every day)`);
      if (facts.days.length !== 7) fail(`${url}: ${facts.days.length} days on the page, expected 7`);
      if (!facts.text.includes(TIER1)) fail(`${url}: the Tier-1 disclaimer is not on the page verbatim`);
      if (!facts.text.includes(CRED)) fail(`${url}: the credential line is not on the page`);
      if (errors.length) warn(`${url}: page errors: ${errors.join(" | ").slice(0, 400)}`);
      const tmp = join(OUT, `.${name}.tmp`);
      // No `outline: true`: Chromium builds PDF bookmarks from laid-out text and joins two words wherever a heading
      // wraps ("resultlooks"). The Contents page links to every day instead (live links in the PDF).
      await page.pdf({ path: tmp, format: "A4", printBackground: true, preferCSSPageSize: true, tagged: true });
      await ctx.close();
      renameSync(tmp, join(OUT, name));
      const buf = readFileSync(join(OUT, name));
      const days = facts.days.map((id) => `day${id.replace("day-", "").padStart(2, "0")}.json`);
      const entry = { name, kind: "handout", week: w, lang, bytes: buf.length, pages: pageCount(buf), sha256: sha256(buf), days: Object.fromEntries(days.map((f) => [f, dayHash[f]])) };
      files.push(entry);
      console.log(`wrote ${rel(join(OUT, name))}: ${(buf.length / 1024 / 1024).toFixed(2)} MB, ${entry.pages} pages`);
    }
  }
} finally {
  await browser.close();
  stop();
}

// ---- 5. manifest (other sections, e.g. the decks, are kept as they are) ----
const mpath = join(OUT, "manifest.json");
let manifest = {};
try { manifest = JSON.parse(readFileSync(mpath, "utf8")); } catch { /* first export */ }
const git = (args) => { const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" }); return r.status === 0 ? r.stdout.trim() : null; };
const prev = manifest.exports?.handouts?.files ?? [];
const merged = [...prev.filter((f) => !files.some((n) => n.name === f.name)), ...files].sort((a, b) => a.name.localeCompare(b.name));
manifest = {
  ...manifest,
  about: "Stage 1 class files in this folder, with the sha256 of every scripts/content_v3/smart/dayNN.json each one was built from. scripts/ci/check_stage1_exports.py warns (non-blocking) when a day file changed after its export.",
  exports: {
    ...(manifest.exports ?? {}),
    handouts: {
      generator: "apps/learn/scripts/export-stage1.mjs",
      generated_at: new Date().toISOString(),
      git_commit: git(["rev-parse", "HEAD"]),
      git_dirty: (git(["status", "--porcelain", "--", "scripts/content_v3/smart", "content"]) ?? "") !== "",
      validator: validation,
      content_in_sync: behind.length === 0,
      content_behind: behind,
      content: Object.fromEntries(CONTENT.map((p) => [p, textSha256(readFileSync(join(ROOT, p)))])),
      files: merged,
    },
  },
};
writeFileSync(mpath, JSON.stringify(manifest, null, 1) + "\n");
for (const f of readdirSync(OUT).filter((f) => f.startsWith(".") && f.endsWith(".tmp"))) rmSync(join(OUT, f));
const total = files.reduce((a, f) => a + f.bytes, 0);
console.log(`wrote ${rel(mpath)}; ${files.length} PDF(s), ${(total / 1024 / 1024).toFixed(2)} MB in all${behind.length ? `; WARNING content/ behind: ${behind.join(", ")}` : ""}${validation !== "ok" ? `; WARNING validator ${validation}` : ""}`);
process.exit(0);

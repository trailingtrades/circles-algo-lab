import { chromium } from "playwright";
const out = "/home/user/circles-algo-lab/docs/phase3-screens";
const dev = /[ऀ-ॿ]/; const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
let bad = [];
// 1) crawl all 60 sessions + path + resources + home with plain fetch (proxy bypassed via NO_PROXY)
const routes = ["/learn/home", "/learn/path", "/learn/resources", ...Array.from({ length: 60 }, (_, i) => `/learn/session/${i + 1}`)];
let locked = 0, open = 0;
for (const r of routes) {
  const res = await fetch(`http://127.0.0.1:3123${r}`); const html = await res.text();
  if (res.status !== 200) bad.push(`${r}: status ${res.status}`);
  if (!html.includes("INH000020004")) bad.push(`${r}: SEBI number missing`);
  if (dev.test(html)) bad.push(`${r}: Devanagari found`);
  if (emoji.test(html.replace(/⚠️/g, ""))) bad.push(`${r}: emoji found`);
  if (r.startsWith("/learn/session/")) { const n = Number(r.split("/").pop()); const isLocked = html.includes("Session complete gate") === false && /locked|Locked/.test(html); if (n >= 4 || n === 21 || n === 41) { if (!isLocked) bad.push(`${r}: expected locked`); else locked++; } else { if (isLocked) bad.push(`${r}: expected open`); else open++; } }
}
console.log(`crawl: ${routes.length} routes, ${open} open sessions, ${locked} locked sessions, ${bad.length} problems`);
// 2) screenshots
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", proxy: { server: "per-context", bypass: "localhost,127.0.0.1" } });
for (const [r, n] of [["/learn/path", "path"], ["/learn/session/3", "session-open"], ["/learn/session/4", "session-locked"], ["/learn/session/21", "session-level-locked"], ["/learn/resources", "resources"], ["/learn/home", "home"]]) for (const w of [360, 1366]) {
  const ctx = await b.newContext({ proxy: { server: "http://127.0.0.1:1", bypass: "localhost,127.0.0.1" }, viewport: { width: w, height: 900 } });
  const p = await ctx.newPage(); await p.goto(`http://localhost:3123${r}`, { waitUntil: "load" }); await p.waitForTimeout(400);
  if (n === "session-open") { for (const t of ["AI Lab", "Quiz", "Journal"]) { await p.getByRole("tab", { name: t }).click(); await p.waitForTimeout(200); await p.screenshot({ path: `${out}/${n}-${t.replace(" ", "").toLowerCase()}-${w}.png`, fullPage: true }); } await p.getByRole("tab", { name: "Watch" }).click(); }
  const hs = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth); if (hs) bad.push(`${r}@${w}: horizontal scroll`);
  await p.screenshot({ path: `${out}/${n}-${w}.png`, fullPage: true }); await ctx.close();
}
await b.close();
if (bad.length) { console.log(bad.join("\n")); console.log("GATE FAIL"); process.exit(1); } console.log("GATE PASS");

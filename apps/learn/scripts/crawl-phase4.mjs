import { chromium } from "playwright";
const out = "/home/user/circles-algo-lab/docs/phase4-screens"; const dev = /[ऀ-ॿ]/; const money = /₹\s?[\d,]+|Rs\.?\s?[\d,]{4,}|P&L|profit %|return %/i;
let bad = [];
const routes = [["/learn/score", "score"], ["/learn/leaderboard", "leaderboard"], ["/learn/exam/foundation-w1", "exam"], ["/learn/exam/foundation-final", "exam-nobank"], ["/learn/portfolio", "portfolio"], ["/learn/mentor", "mentor"], ["/learn/home", "home"]];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", proxy: { server: "per-context", bypass: "localhost,127.0.0.1" } });
for (const [r, n] of routes) for (const w of [360, 1366]) {
  const ctx = await b.newContext({ proxy: { server: "http://127.0.0.1:1", bypass: "localhost,127.0.0.1" }, viewport: { width: w, height: 900 } });
  const p = await ctx.newPage(); const res = await p.goto(`http://localhost:3123${r}`, { waitUntil: "load" }); await p.waitForTimeout(400);
  const html = await p.content(); const text = await p.evaluate(() => document.body.innerText);
  if (res.status() !== 200) bad.push(`${r}: ${res.status()}`); if (!html.includes("INH000020004")) bad.push(`${r}: SEBI missing`); if (dev.test(html)) bad.push(`${r}: Devanagari`);
  if (n === "leaderboard") { if (money.test(text)) bad.push(`${r}: money-like figure on leaderboard`); if (!text.includes("Ye score aapke process ka hai")) bad.push(`${r}: process note missing`); if (!text.includes("SEBI registration and NISM certification do not guarantee returns")) bad.push(`${r}: Tier-2 missing`); }
  if (n === "portfolio" && !/VIRTUAL/.test(text)) bad.push(`${r}: VIRTUAL badge missing`);
  const hs = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth); if (hs) bad.push(`${r}@${w}: horizontal scroll`);
  if (n === "leaderboard" && w === 1366) for (const t of ["Consistency", "Most Improved"]) { await p.getByRole("tab", { name: t }).click(); await p.waitForTimeout(150); const tx = await p.evaluate(() => document.body.innerText); if (money.test(tx)) bad.push(`${t} tab: money-like figure`); await p.screenshot({ path: `${out}/leaderboard-${t.replace(" ", "").toLowerCase()}-${w}.png`, fullPage: true }); }
  await p.screenshot({ path: `${out}/${n}-${w}.png`, fullPage: true }); await ctx.close();
}
await b.close(); console.log(bad.join("\n")); console.log(bad.length ? "GATE FAIL" : "GATE PASS");

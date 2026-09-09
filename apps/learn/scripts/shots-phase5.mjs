import { chromium } from "playwright";
const out = "/home/user/circles-algo-lab/docs/phase5-screens";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", proxy: { server: "per-context", bypass: "localhost,127.0.0.1" } });
const routes = [["/learn/certificate","certificate"],["/verify/5C-FOUND-2026-ZZZZZZ","verify-unknown"],["/verify/lookup","verify-lookup"],["/learn","login-grievance"],["/learn/admin/content","admin-content"],["/learn/admin/compliance","admin-compliance"]];
let bad = [];
for (const [r, n] of routes) for (const w of [360, 1366]) {
  const ctx = await b.newContext({ proxy: { server: "http://127.0.0.1:1", bypass: "localhost,127.0.0.1" }, viewport: { width: w, height: 900 } });
  const p = await ctx.newPage(); const res = await p.goto(`http://localhost:3123${r}`, { waitUntil: "load" }); await p.waitForTimeout(400);
  const m = await p.evaluate(() => ({ hs: document.documentElement.scrollWidth > document.documentElement.clientWidth, sebi: document.body.innerText.includes("INH000020004"), dev: /[ऀ-ॿ]/.test(document.body.innerText) }));
  if (res.status() !== 200 || m.hs || !m.sebi || m.dev) bad.push(`${r}@${w}: status ${res.status()} hs=${m.hs} sebi=${m.sebi} dev=${m.dev}`);
  await p.screenshot({ path: `${out}/${n}-${w}.png`, fullPage: true }); await ctx.close();
}
await b.close(); console.log(bad.join("\n") || "GATE PASS");

import { chromium } from "playwright";
const out = "/home/user/circles-algo-lab/docs/phase6-screens";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", proxy: { server: "per-context", bypass: "localhost,127.0.0.1" } });
for (const [r, n] of [["/learn/home", "home-light"], ["/learn/portfolio", "portfolio-light"], ["/learn/session/3", "session-light"]]) for (const w of [360, 1366]) {
  const ctx = await b.newContext({ proxy: { server: "http://127.0.0.1:1", bypass: "localhost,127.0.0.1" }, viewport: { width: w, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem("fc_theme", "light"));
  const p = await ctx.newPage(); await p.goto(`http://localhost:3123${r}`, { waitUntil: "load" }); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/${n}-${w}.png`, fullPage: false }); await ctx.close();
}
// offline banner
const ctx = await b.newContext({ proxy: { server: "http://127.0.0.1:1", bypass: "localhost,127.0.0.1" }, viewport: { width: 360, height: 700 } });
const p = await ctx.newPage(); await p.goto("http://localhost:3123/learn/home", { waitUntil: "load" }); await ctx.setOffline(true); await p.waitForTimeout(500);
await p.screenshot({ path: `${out}/offline-360.png` }); const txt = await p.evaluate(() => document.querySelector(".lrn-offline")?.textContent ?? ""); console.log("offline banner:", txt ? "shown" : "MISSING");
await b.close();

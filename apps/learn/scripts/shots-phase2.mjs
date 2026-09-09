import { chromium } from "playwright";
const out = "/home/user/circles-algo-lab/docs/phase2-screens";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", proxy: { server: "per-context", bypass: "localhost,127.0.0.1" } });
const routes = [["/learn?suspended=1","login-suspended"],["/learn/reset","reset"],["/learn/invite/not-a-real-token","invite-invalid"],["/learn/admin","admin-unconfigured"],["/learn/profile","profile-signed-out"]];
const rep = [];
for (const [r, n] of routes) for (const w of [360, 1366]) {
  const ctx = await b.newContext({ proxy: { server: "http://127.0.0.1:1", bypass: "localhost,127.0.0.1" }, viewport: { width: w, height: 900 } });
  const p = await ctx.newPage(); await p.goto(`http://localhost:3123${r}`, { waitUntil: "load" }); await p.waitForTimeout(400);
  const m = await p.evaluate(() => ({ hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth, sebi: document.body.innerText.includes("INH000020004") }));
  await p.screenshot({ path: `${out}/${n}-${w}.png`, fullPage: true }); rep.push({ r, w, ...m }); await ctx.close();
}
await b.close(); console.table(rep); console.log(rep.every(x => !x.hscroll && x.sebi) ? "GATE PASS" : "GATE FAIL");

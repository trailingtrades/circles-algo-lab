import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
const routes = [["/learn", "login"], ["/learn/home", "home"], ["/learn/session/3", "session"], ["/learn/leaderboard", "leaderboard"]];
const chrome = await launch({ chromePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", chromeFlags: ["--headless=new", "--no-sandbox", "--proxy-server=direct://", "--proxy-bypass-list=*"] });
const rows = [];
for (const [r, n] of routes) {
  const res = await lighthouse(`http://localhost:3123${r}`, { port: chrome.port, output: "json", logLevel: "error", onlyCategories: ["performance", "accessibility", "best-practices", "seo"], formFactor: "mobile", screenEmulation: { mobile: true, width: 360, height: 780, deviceScaleFactor: 2, disabled: false }, throttlingMethod: "simulate" });
  const c = res.lhr.categories; const s = (k) => Math.round((c[k]?.score ?? 0) * 100);
  rows.push({ route: r, perf: s("performance"), a11y: s("accessibility"), bp: s("best-practices"), seo: s("seo"), lcp: Math.round(res.lhr.audits["largest-contentful-paint"].numericValue), cls: res.lhr.audits["cumulative-layout-shift"].numericValue.toFixed(3) });
  const fs = await import("node:fs"); fs.writeFileSync(`/home/user/circles-algo-lab/docs/phase6-reports/lighthouse-${n}.json`, JSON.stringify({ scores: rows.at(-1), failing: Object.values(res.lhr.audits).filter((a) => a.score !== null && a.score < 0.9 && !["informative", "notApplicable"].includes(a.scoreDisplayMode)).map((a) => `${a.id}: ${a.title}`) }, null, 1));
}
await chrome.kill(); console.table(rows);
console.log(rows.every((r) => r.perf >= 90 && r.a11y === 100) ? "LIGHTHOUSE GATE PASS" : "LIGHTHOUSE GATE FAIL");

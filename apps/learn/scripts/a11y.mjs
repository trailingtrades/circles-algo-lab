import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
const routes = ["/learn", "/learn/reset", "/learn/invite/x", "/verify/lookup", "/learn/home", "/learn/path", "/learn/session/3", "/learn/session/4", "/learn/exam/foundation-w1", "/learn/portfolio", "/learn/score", "/learn/leaderboard", "/learn/certificate", "/learn/resources", "/learn/profile", "/learn/admin", "/learn/mentor"];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", proxy: { server: "per-context", bypass: "localhost,127.0.0.1" } });
let total = 0; const out = [];
for (const theme of ["dark", "light"]) for (const r of routes) {
  const ctx = await b.newContext({ proxy: { server: "http://127.0.0.1:1", bypass: "localhost,127.0.0.1" }, viewport: { width: 1366, height: 900 } });
  await ctx.addInitScript((t) => localStorage.setItem("fc_theme", t), theme);
  const p = await ctx.newPage(); await p.goto(`http://localhost:3123${r}`, { waitUntil: "load" }); await p.waitForTimeout(300);
  const res = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  for (const v of res.violations) { total += v.nodes.length; out.push(`${theme} ${r} [${v.impact}] ${v.id}: ${v.help} — ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`); }
  await ctx.close();
}
await b.close(); console.log(out.join("\n") || "no violations"); console.log(`axe: ${routes.length * 2} page-renders, ${total} violation nodes`);

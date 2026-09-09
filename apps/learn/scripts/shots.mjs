import { chromium } from "playwright";
const out = "/home/user/circles-algo-lab/docs/phase1-screens";
const widths = [320, 360, 768, 1366, 1536, 1920];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", proxy: { server: "per-context", bypass: "localhost,127.0.0.1" } }).catch(async()=>chromium.launch());
const report = [];
for (const [route, name] of [["/learn/home","home"],["/learn","login"]]) {
  for (const w of widths) {
    for (const [theme, lang] of [["dark","en"],["light","hi"]]) {
      const ctx = await b.newContext({ proxy: { server: "http://127.0.0.1:1", bypass: "localhost,127.0.0.1" }, viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
      await ctx.addInitScript(([t,l]) => { localStorage.setItem("fc_theme", t); localStorage.setItem("fc_lang", l); }, [theme, lang]);
      const p = await ctx.newPage();
      await p.goto(`http://localhost:3123${route}`, { waitUntil: "load" });
      const m = await p.evaluate(() => {
        const d = document.documentElement;
        const creds = [...document.querySelectorAll("*")].filter(e => e.children.length === 0 && (e.textContent||"").includes("INH000020004")).map(e => e.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0);
        const r = creds.find(r => r.right <= d.clientWidth + 1) || null;
        const foot = document.querySelector(".lrn-footer p:last-child");
        const fs = foot ? getComputedStyle(foot) : null;
        return { scrollW: d.scrollWidth, clientW: d.clientWidth, hscroll: d.scrollWidth > d.clientWidth,
          credVisible: !!r && r.width > 0 && r.right <= d.clientWidth + 1,
          font: getComputedStyle(document.body).fontFamily.split(",")[0],
          footerClamp: fs ? (fs.webkitLineClamp !== "none" || fs.textOverflow === "ellipsis" || fs.maxHeight !== "none") : null,
          tier1Full: (foot?.textContent||"").length };
      });
      await p.screenshot({ path: `${out}/${name}-${w}-${theme}-${lang}.png`, fullPage: true });
      report.push({ route, w, theme, lang, ...m });
      await ctx.close();
    }
  }
}
await b.close();
console.table(report);
const bad = report.filter(r => r.hscroll || !r.credVisible || r.footerClamp || r.tier1Full < 400 || !r.font.includes("IBM Plex"));
console.log(bad.length ? "GATE FAIL" : "GATE PASS", bad);

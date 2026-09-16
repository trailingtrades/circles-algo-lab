/**
 * Builds docs/5C_LEARN_PREVIEW.html: a single-file, JS-free static preview of 12 screens rendered by the app in demo mode.
 *   1. cd apps/learn && npx next build && (unset Supabase env) npx next start -p 3000
 *   2. node scripts/build-preview.mjs
 * Inlines CSS, fonts and images as data URIs, strips scripts, and resolves Next.js streaming boundaries
 * (loading.tsx skeleton + hidden <div id="S:n"> payload) so the real content is what shows.
 */
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const BASE = process.env.PREVIEW_BASE ?? "http://localhost:3000";
const SCREENS = [
  ["pv-login", "Login", "/learn"], ["pv-home", "Home", "/learn/home"], ["pv-path", "Path", "/learn/path"], ["pv-session", "Session", "/learn/session/3"],
  ["pv-locked", "Locked", "/learn/session/9"], ["pv-exam", "Exam", "/learn/exam/foundation-w1"], ["pv-score", "Score", "/learn/score"], ["pv-leaderboard", "Leaderboard", "/learn/leaderboard"],
  ["pv-portfolio", "Portfolio", "/learn/portfolio"], ["pv-certificate", "Certificate", "/learn/certificate"], ["pv-resources", "Resources", "/learn/resources"], ["pv-verify", "Verify", "/verify/lookup"],
];
const PV_CSS = `body{padding-top:88px}
html{scroll-padding-top:88px} /* the deferred #pv-* fragment scroll lands sections below the fixed bar */
/* fixed, not sticky: globals.css puts overflow-x:hidden on body, which makes body its own
   scroll container and un-sticks sticky children in standards mode */
.pv-bar{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:10px 12px;background:#0d0f13;border-bottom:1px solid rgba(255,255,255,.09)}
.pv-bar strong{font-family:"IBM Plex Mono",monospace;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#97a1b3;margin-right:6px}
.pv-tab{height:30px;padding:0 12px;border-radius:9999px;border:1px solid rgba(255,255,255,.12);background:transparent;color:#f2f5f9;font:600 13px "IBM Plex Sans",sans-serif;cursor:pointer}
.pv-tab[aria-selected="true"]{background:#0b74b8;border-color:#0b74b8;color:#fff}
.pv-tab:focus-visible{outline:2px solid #00AEEF;outline-offset:2px}
.pv-note{margin-left:auto;font-family:"IBM Plex Mono",monospace;font-size:12px;color:#97a1b3}
.pv-screen{min-height:auto}
.pv-screen a{cursor:pointer}`;
const PV_SCRIPT = `<script>
(function(){
  var tabs=[].slice.call(document.querySelectorAll('.pv-tab')),screens=[].slice.call(document.querySelectorAll('.pv-screen'));
  function show(id){screens.forEach(function(s){s.hidden=s.id!==id});tabs.forEach(function(t){t.setAttribute('aria-selected',String(t.dataset.target===id))});try{history.replaceState(null,'','#'+id)}catch(e){}window.scrollTo(0,0)}
  tabs.forEach(function(t){t.addEventListener('click',function(){show(t.dataset.target)})});
  var map={'/learn/home':'pv-home','/learn/path':'pv-path','/learn/score':'pv-score','/learn/leaderboard':'pv-leaderboard','/learn/portfolio':'pv-portfolio','/learn/certificate':'pv-certificate','/learn/resources':'pv-resources','/learn':'pv-login','/learn/profile':'pv-home'};
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href')||'';if(h.indexOf('http')===0)return;e.preventDefault();if(h.indexOf('/learn/session/')===0){show(/\\/(1|2|3)$/.test(h)?'pv-session':'pv-locked');return}if(h.indexOf('/learn/exam/')===0){show('pv-exam');return}if(h.indexOf('/verify')===0){show('pv-verify');return}show(map[h.split('?')[0]]||'pv-home')});
  document.addEventListener('submit',function(e){e.preventDefault()});
  var start=(location.hash||'#pv-home').slice(1);show(document.getElementById(start)?start:'pv-home');
})();
</script>`;

const mime = (u) => u.endsWith(".woff2") ? "font/woff2" : u.endsWith(".png") ? "image/png" : u.endsWith(".svg") ? "image/svg+xml" : u.endsWith(".ico") ? "image/x-icon" : u.endsWith(".jpg") || u.endsWith(".jpeg") ? "image/jpeg" : "application/octet-stream";
const cache = new Map();
async function dataUri(path) {
  if (cache.has(path)) return cache.get(path);
  const r = await fetch(BASE + path); if (!r.ok) throw new Error(`${r.status} ${path}`);
  const b = Buffer.from(await r.arrayBuffer());
  const d = `data:${r.headers.get("content-type")?.split(";")[0] || mime(path)};base64,${b.toString("base64")}`;
  cache.set(path, d); return d;
}
async function inlineCss(href) {
  let css = await (await fetch(BASE + href)).text();
  const urls = [...new Set([...css.matchAll(/url\((\/_next\/static\/media\/[^)"']+)\)/g)].map((m) => m[1]))];
  for (const u of urls) css = css.split(`url(${u})`).join(`url(${await dataUri(u)})`);
  return css;
}
function unstream(body) {
  // remove loading.tsx fallbacks, then move each hidden S:n payload into its pending boundary.
  body = body.replace(/<div aria-busy="true" aria-live="polite">[\s\S]*?<span class="sr-only">Loading<\/span><\/div>/g, "");
  body = body.replace(/<template id="[BP]:[^"]+"><\/template>/g, "");
  const blocks = [];
  body = body.replace(/<div hidden id="(S:[^"]+)">([\s\S]*?)<\/div>(?=\s*(?:<script|<div hidden id="S:|$))/g, (_, id, inner) => { blocks.push(inner); return ""; });
  for (const inner of blocks) body = body.replace("<!--$?-->", "<!--$-->" + inner);
  return body;
}
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium" });
async function screen([id, name, route]) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await page.goto(BASE + route, { waitUntil: "load" }); await page.waitForTimeout(800);
  const html = await page.content(); await page.close();
  const css = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
  const bodyCls = (html.match(/<body[^>]*class="([^"]*)"/) || [, "col-root col-ground-dark"])[1];
  let body = html.slice(html.indexOf(">", html.indexOf("<body")) + 1, html.lastIndexOf("</body>"));
  body = body.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<link[^>]*>/g, "");
  body = unstream(body);
  // images: use the largest srcSet candidate as a data URI
  body = body.replace(/ srcSet="[^"]*"/g, "").replace(/ sizes="[^"]*"/g, "");
  const imgs = [...new Set([...body.matchAll(/src="(\/_next\/image\?[^"]+)"/g)].map((m) => m[1]))];
  for (const u of imgs) body = body.split(u).join(await dataUri(u.replace(/&amp;/g, "&")));
  return { id, name, css, body: `<section class="pv-screen" id="${id}" data-name="${name}" hidden><div class="${bodyCls}">${body}</div></section>` };
}
const out = [];
const cssSet = new Set();
for (const s of SCREENS) { const r = await screen(s); out.push(r); r.css.forEach((c) => cssSet.add(c)); console.log("rendered", s[2]); }
let appCss = ""; for (const c of cssSet) appCss += await inlineCss(c);
const bar = `<div class="pv-bar" role="tablist" aria-label="Screens"><strong>5C Learn · preview</strong>${out.map((s) => `<button class="pv-tab" role="tab" aria-selected="${s.id === "pv-home"}" data-target="${s.id}">${s.name}</button>`).join("")}<span class="pv-note">static preview · demo data · not deployed</span></div>`;
// data-theme must exist on <html> at parse time — the Winners tokens live on [data-theme=dark]/[data-theme=light], and dark is the default (no attribute-less state).
const html = `<!doctype html>\n<html data-theme="dark">\n<title>5C Learn Preview</title>\n<style>${appCss}</style>\n<style>\n${PV_CSS}\n</style>\n${bar}\n${out.map((s) => s.body).join("\n")}\n${PV_SCRIPT}\n</html>\n`;
const dest = join(ROOT, "docs", "5C_LEARN_PREVIEW.html");
writeFileSync(dest, html);
console.log("wrote", dest, (html.length / 1e6).toFixed(2), "MB; skeletons left:", (html.match(/aria-busy="true"/g) || []).length, "; hidden payloads left:", (html.match(/<div hidden id="S:/g) || []).length);
await browser.close();

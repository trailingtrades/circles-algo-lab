import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/i18n/LangProvider";
import { getLang } from "@/lib/i18n/server";
import { htmlLang } from "@/lib/i18n/lang";
import { getViewer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Circle S.M.A.R.T · 5 Circles Pvt Ltd",
  description: "AI Trading Course learner dashboard by 5 Circles Pvt Ltd, SEBI Registered Research Analyst, Reg. No. INH000020004.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

/* Stamp the theme before first paint (Winners rule: dark is the default and
   data-theme always exists — never an attribute-less state). Values in
   localStorage are JSON-encoded under the shared `5cd.` prefix. */
const themeStamp = `(function(){var t="dark";try{var v=localStorage.getItem("5cd.theme");var p=v?JSON.parse(v):null;if(p==="light"||p==="dark"){t=p}else if(localStorage.getItem("fc_theme")==="light"){t="light"}}catch(e){}document.documentElement.setAttribute("data-theme",t);var b=document.body;if(b){b.classList.toggle("col-light",t==="light");b.classList.toggle("col-ground-light",t==="light");b.classList.toggle("col-ground-dark",t!=="light")}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The language cookie (written by a switch, or at sign-in) decides the server render, so lessons,
  // quizzes and buttons all arrive in the learner's language — no English flash. A signed-in device
  // without that cookie follows the profile, exactly as the (app) layout and pages do, so the client
  // chrome, <html lang> and the page content agree. getViewer() is cached per request: the (app)
  // layout and pages reuse this read, and a signed-out visitor costs no network call.
  const v = supabaseConfigured() ? await getViewer() : null;
  const lang = await getLang(v?.lang);
  return (
    <html lang={htmlLang(lang)} data-lang={lang} data-theme="dark" suppressHydrationWarning>
      <body className="col-root col-ground-dark" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeStamp }} />
        <LangProvider initialLang={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}

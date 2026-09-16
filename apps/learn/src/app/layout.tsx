import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/i18n/LangProvider";

export const metadata: Metadata = {
  title: "Circle S.M.A.R.T · 5 Circles Pvt Ltd",
  description: "AI Trading Course learner dashboard by 5 Circles Pvt Ltd, SEBI Registered Research Analyst, Reg. No. INH000020004.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

/* Stamp the theme before first paint (Winners rule: dark is the default and
   data-theme always exists — never an attribute-less state). Values in
   localStorage are JSON-encoded under the shared `5cd.` prefix. */
const themeStamp = `(function(){var t="dark";try{var v=localStorage.getItem("5cd.theme");var p=v?JSON.parse(v):null;if(p==="light"||p==="dark"){t=p}else if(localStorage.getItem("fc_theme")==="light"){t="light"}}catch(e){}document.documentElement.setAttribute("data-theme",t);var b=document.body;if(b){b.classList.toggle("col-light",t==="light");b.classList.toggle("col-ground-light",t==="light");b.classList.toggle("col-ground-dark",t!=="light")}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className="col-root col-ground-dark" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeStamp }} />
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/i18n/LangProvider";

export const metadata: Metadata = {
  title: "5C Learn · 5 Circles Pvt Ltd",
  description: "AI Trading Course learner dashboard by 5 Circles Pvt Ltd, SEBI Registered Research Analyst, Reg. No. INH000020004.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="col-root col-ground-dark">
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}

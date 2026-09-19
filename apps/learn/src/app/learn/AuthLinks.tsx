import Link from "next/link";
import { t3, tr, type Lang } from "@/lib/i18n/lang";

/* The way out of every auth dead end (bad invite, expired link, missing page): back to sign-in, the
   Academy landing, or a person on WhatsApp. No hooks, so server and client pages can both use it. */
const WA = "https://wa.me/918120040440"; // the Academy's enrolment line, same as the landing's buttons
const S = {
  nav: t3("Other ways in", "Aur raaste", "दूसरे रास्ते"),
  signIn: t3("Back to sign in", "Sign in par wapas", "साइन इन पर वापस"),
  academy: t3("5 Circles Academy home", "5 Circles Academy home", "5 Circles Academy होम"),
  whatsapp: t3("Message us on WhatsApp", "WhatsApp par message kijiye", "WhatsApp पर मैसेज कीजिए"),
  waText: t3("Hi, I need help signing in to CIRCLE S.M.A.R.T.", "Namaste, mujhe CIRCLE S.M.A.R.T mein sign in karne mein madad chahiye.", "नमस्ते, मुझे CIRCLE S.M.A.R.T में साइन इन करने में मदद चाहिए।"),
  waInvite: t3("Hi, I need an invite link for CIRCLE S.M.A.R.T.", "Namaste, mujhe CIRCLE S.M.A.R.T ka invite link chahiye.", "नमस्ते, मुझे CIRCLE S.M.A.R.T का इनवाइट लिंक चाहिए।"),
};

/** WhatsApp chat with a prefilled first line in the reader's language. */
export const waLink = (lang: Lang, about: "help" | "invite" = "help") => `${WA}?text=${encodeURIComponent(tr(about === "invite" ? S.waInvite : S.waText, lang))}`;

export function AuthLinks({ lang, signIn = true }: { lang: Lang; signIn?: boolean }) {
  return (
    <nav aria-label={tr(S.nav, lang)} className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4" style={{ fontSize: "var(--col-text-body-sm)" }}>
      {signIn && <Link href="/learn" className="lrn-link">{tr(S.signIn, lang)}</Link>}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the Academy landing is a static site at the domain root, outside the /smart basePath, so next/link would point inside the app */}
      <a href="/" className="lrn-link">{tr(S.academy, lang)}</a>
      <a href={waLink(lang)} className="lrn-link" target="_blank" rel="noopener noreferrer">{tr(S.whatsapp, lang)}</a>
    </nav>
  );
}

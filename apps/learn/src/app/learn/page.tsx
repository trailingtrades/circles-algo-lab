"use client";
import Image from "next/image";
import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { useLang } from "@/lib/i18n/LangProvider";
import { ComplianceFooter } from "@/components/ui/ComplianceFooter";
import { CREDENTIAL_LINE, COMPANY } from "@/lib/compliance/strings";
import { signIn } from "./actions";
import { AlertCircle } from "@/components/ui/Icon";
import { RingsArt } from "@/components/ui/CourseArt";
import { AcademyStrip } from "@/components/shell/AcademyStrip";

/* Daily motivation on the sign-in gate — process and discipline only, never returns (§1.4).
   Picked by day-of-year so every student sees the same line all day, a new one tomorrow. */
const QUOTES: [string, string][] = [
  ["One session a day beats ten on Sunday.", "Roz ek session, Sunday ke dus se behtar."],
  ["The market rewards process, not predictions.", "Market process ko izzat deta hai, prediction ko nahi."],
  ["Small consistent steps build the trader, not one big trade.", "Trader roz ke chhote steps se banta hai, ek bade trade se nahi."],
  ["Your journal is your best mentor after your mentor.", "Mentor ke baad sabse achha mentor — aapka journal."],
  ["Risk first. Entry later.", "Pehle risk socho, entry baad mein."],
  ["Losing small is a skill. Practise it.", "Chhota loss lena ek skill hai. Roz practice karo."],
  ["Charts repeat. So should your routine.", "Charts repeat hote hain. Aapka routine bhi hona chahiye."],
  ["Finish today's session — your future self is watching.", "Aaj ka session poora karo — kal wale aap dekh rahe hain."],
  ["Patience is also a position.", "Sabr bhi ek position hai."],
  ["Rules protect you when emotions won't.", "Jab emotions saath chhod dein, rules bachate hain."],
  ["Study the loss longer than you celebrate the win.", "Jeet se zyada der haar ko padho."],
  ["Every expert was once on Day 1. Stay on the path.", "Har expert kabhi Day 1 par tha. Raaste par bane raho."],
];
function quoteOfTheDay(lang: string): string {
  const now = new Date();
  const day = Math.floor((now.getTime() - Date.UTC(now.getUTCFullYear(), 0, 0)) / 86400000);
  const q = QUOTES[day % QUOTES.length];
  return lang === "hi" ? q[1] : q[0];
}

function LoginInner() {
  const { t, lang, setLang } = useLang();
  const [state, action, pending] = useActionState(signIn, {});
  const params = useSearchParams();
  const notice = params.get("suspended") ? "Ye account suspended hai. Apne mentor se sampark kijiye." : params.get("set") ? "Password set ho gaya. Ab sign in kijiye." : params.get("error") === "link" ? "Link expire ho gaya ya galat hai." : null;
  // One Academy login for every stage: when the stage gate bounced the student here
  // (?next=/winners/ or /one/), the header names the programme they are opening.
  const next = params.get("next");
  const stage = next === "/winners/"
    ? { title: "CIRCLE W.I.N.N.E.R.S", kicker: "Stage 2 · 5 Circles Academy" }
    : next === "/one/"
      ? { title: "CIRCLE O.N.E", kicker: "Stage 3 · 5 Circles Academy" }
      : { title: "CIRCLE S.M.A.R.T", kicker: "Level 1 · 5 Circles Academy" };
  return (
    <div className="lrn-shell lrn-gate">
      <AcademyStrip />
      <div className="lrn-gate__rings" aria-hidden><RingsArt /></div>
      <main className="lrn-main flex flex-col items-center justify-center" style={{ paddingTop: 48 }}>
        <div className="lrn-login">
          <div className="flex flex-col items-center gap-2 mb-6 text-center">
            <a className="lrn-login__logo" href="/" title="5 Circles Academy" aria-label="Back to 5 Circles Academy">
              <Image src={(process.env.NEXT_PUBLIC_BASE_PATH || "") + "/brand/logo.png"} alt="5 Circles" width={64} height={64} priority />
            </a>
            <h1 className="lrn-title wm">{stage.title}</h1>
            <p className="lrn-kicker">{stage.kicker}</p>
            <p className="col-eyebrow">{COMPANY.tagline}</p>
            <p className="lrn-muted" style={{ margin: 0 }}>{t("welcome")}</p>
          </div>
          <blockquote className="lrn-quote">
            <span className="lrn-quote__label">{lang === "hi" ? "Aaj ka focus" : "Today's focus"}</span>
            <p className="lrn-quote__text">{quoteOfTheDay(lang)}</p>
          </blockquote>
          <form className="col-card" action={action} aria-label="Sign in">
            <input type="hidden" name="next" value={params.get("next") ?? ""} />
            {notice && <p className="lrn-notice" role="status"><AlertCircle size={16} aria-hidden /> {notice}</p>}
            <div className="lrn-field"><label htmlFor="email">Email</label><input id="email" name="email" className="col-input" type="email" autoComplete="email" inputMode="email" required /></div>
            <div className="lrn-field"><label htmlFor="pw">Password</label><input id="pw" name="password" className="col-input" type="password" autoComplete="current-password" required /></div>
            {state.error && <p className="lrn-error" role="alert"><AlertCircle size={16} aria-hidden /> {state.error}</p>}
            <button type="submit" className="col-btn col-btn--primary w-full justify-center" disabled={pending}>{pending ? "Signing in" : "Sign in"}</button>
            <p className="lrn-muted mt-3 text-center" style={{ fontSize: "var(--col-text-body-sm)" }}>{t("inviteHint")}</p>
            <p className="text-center" style={{ fontSize: "var(--col-text-body-sm)", margin: "4px 0 0" }}><Link href="/learn/reset" className="lrn-link">Forgot password?</Link></p>
            <button type="button" className="lrn-toggle mt-3 w-full" onClick={() => setLang(lang === "en" ? "hi" : "en")}>{lang === "en" ? "Hinglish mein dekhein" : "View in English"}</button>
          </form>
          <p className="col-eyebrow mt-4 text-center">{CREDENTIAL_LINE}</p>
        </div>
      </main>
      <ComplianceFooter tier={1} grievance />
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginInner /></Suspense>;
}

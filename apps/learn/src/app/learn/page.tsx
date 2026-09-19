import Image from "next/image";
import { ComplianceFooter } from "@/components/ui/ComplianceFooter";
import { RingsArt } from "@/components/ui/CourseArt";
import { AcademyStrip } from "@/components/shell/AcademyStrip";
import { getLang } from "@/lib/i18n/server";
import { t3, tr, type L, type Lang } from "@/lib/i18n/lang";
import { AUTH } from "@/lib/auth/messages";
import { stageOf } from "@/lib/auth/paths";
import { SignInForm, type Notice } from "./SignInForm";
import { LangSelect } from "./LangSelect";

/* Server-rendered on purpose: the form, the SEBI number and the Tier-1 disclaimer are in the HTML
   itself (the old client-only page served an empty shell until JavaScript ran). */
const S = {
  kicker1: t3("Stage 1 · 5 Circles Academy", "Stage 1 · 5 Circles Academy", "स्टेज 1 · 5 Circles Academy"),
  kicker2: t3("Stage 2 · 5 Circles Academy", "Stage 2 · 5 Circles Academy", "स्टेज 2 · 5 Circles Academy"),
  kicker3: t3("Stage 3 · 5 Circles Academy", "Stage 3 · 5 Circles Academy", "स्टेज 3 · 5 Circles Academy"),
  welcome: t3("Welcome back. Sign in to continue your course.", "Phir se swagat hai. Sign in karke course aage badhaiye.", "फिर से स्वागत है। साइन इन करके कोर्स आगे बढ़ाइए।"),
  // One quiet course rule, the same every day. No rotating slogans above a password field.
  rule: t3("One session a day. Risk first, entry later.", "Roz ek session. Pehle risk, entry baad mein.", "रोज़ एक सेशन। पहले रिस्क, एंट्री बाद में।"),
  logo: t3("Back to 5 Circles Academy", "5 Circles Academy par wapas", "5 Circles Academy पर वापस"),
  set: t3("Your password is set. Please sign in.", "Aapka password set ho gaya. Ab sign in kijiye.", "आपका पासवर्ड सेट हो गया। अब साइन इन कीजिए।"),
  resetLink: t3("Request a new reset link", "Naya reset link maangiye", "नया रीसेट लिंक माँगिए"),
};

type SP = Record<string, string | string[] | undefined>;

function noticeFor(sp: SP, lang: Lang): Notice {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const say = (x: L): Notice => ({ text: tr(x, lang) });
  if (one("suspended")) return say(AUTH.suspended);
  if (one("inactive")) return say(AUTH.inactive);
  if (one("set")) return say(S.set);
  if (one("error") === "link") {
    const reason = one("reason") ?? "";
    if (reason === "user_banned") return say(AUTH.suspended);
    const base = reason === "pkce_code_verifier_not_found" ? AUTH.otherBrowser : AUTH.expired;
    return one("kind") === "reset" ? { text: tr(base, lang), href: "/learn/reset", label: tr(S.resetLink, lang) } : say(base);
  }
  // Supabase's own verify endpoint, when a link is dead, lands here with ?error=…&error_code=….
  if (one("error_code") || one("error")) return say(AUTH.expired);
  return null;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const lang = await getLang();
  const next = typeof sp.next === "string" ? sp.next : "";
  // One Academy login for every stage: when the stage gate sent the student here, name the programme they are opening.
  const stage = stageOf(next);
  const title = stage === "winners" ? "CIRCLE W.I.N.N.E.R.S" : stage === "one" ? "CIRCLE O.N.E" : "CIRCLE S.M.A.R.T";
  const kicker = stage === "winners" ? S.kicker2 : stage === "one" ? S.kicker3 : S.kicker1;
  return (
    <div className="lrn-shell lrn-gate">
      <AcademyStrip />
      <main className="lrn-main flex flex-col items-center justify-center" style={{ paddingTop: 32 }}>
        {/* Inside <main>, not the shell: the rings centre on the form, never behind the compliance footer. */}
        <div className="lrn-gate__rings" aria-hidden><RingsArt /></div>
        <div className="lrn-login">
          <div className="flex justify-end mb-2"><LangSelect /></div>
          <div className="flex flex-col items-center gap-2 mb-6 text-center">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the Academy landing is a static site at the domain root, outside the /smart basePath, so next/link would point inside the app */}
            <a href="/" className="inline-flex" title="5 Circles Academy" aria-label={tr(S.logo, lang)}>
              <Image src={(process.env.NEXT_PUBLIC_BASE_PATH || "") + "/brand/logo.png"} alt="5 Circles" width={64} height={64} priority />
            </a>
            <h1 className="lrn-title">{title}</h1>
            <p className="lrn-kicker" style={{ margin: 0 }}>{tr(kicker, lang)}</p>
            <p className="lrn-muted" style={{ margin: 0 }}>{tr(S.welcome, lang)}</p>
          </div>
          <SignInForm next={next} notice={noticeFor(sp, lang)} />
          <p className="lrn-muted text-center" style={{ fontSize: "var(--col-text-body-sm)", margin: "16px 0 0" }}>{tr(S.rule, lang)}</p>
        </div>
      </main>
      <ComplianceFooter tier={1} />
    </div>
  );
}

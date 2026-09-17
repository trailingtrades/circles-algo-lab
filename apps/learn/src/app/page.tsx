import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ComplianceFooter } from "@/components/ui/ComplianceFooter";
import s from "./academy.module.css";

export const metadata: Metadata = {
  title: "5 Circles Academy",
  description: "Four stages, one path — CIRCLE S.M.A.R.T, W.I.N.N.E.R.S, O.N.E and PRO by 5 Circles Pvt Ltd (SEBI RA INH000020004).",
};

type Stage = {
  no: number;
  live: boolean;
  name: string;
  subtitle: string;
  blurb: string;
  points: string[];
  href?: string;
};

// Stage ladder rebuilt from the original Academy landing. Stages 2-3 run on
// their own platforms; until those URLs are wired here their buttons open the
// S.M.A.R.T gate, which is also where access codes are checked.
const STAGES: Stage[] = [
  {
    no: 1,
    live: true,
    name: "CIRCLE S.M.A.R.T",
    subtitle: "AI Trading Course · 21-day guided foundation",
    blurb:
      "Learn to trade with an AI co-pilot — 21 guided sessions in three weeks: markets, charts, one risk rule and your first rule-based routine. Virtual money only; AI = analyst, human = trigger.",
    points: [
      "21 sessions · EN / Hinglish",
      "AI co-pilot lab + quiz in every session",
      "Weekend Quiz Games + a final exam",
      "Mock portfolio (virtual money) · process-score leaderboard",
    ],
    href: "/learn",
  },
  {
    no: 2,
    live: true,
    name: "CIRCLE W.I.N.N.E.R.S",
    subtitle: "Foundations · 12 modules + 90-pattern library",
    blurb:
      "Learn to trade like the top 1%. Charts, candlesticks, patterns, basic options, risk & psychology, markets & taxation — with live sessions and a monthly championship.",
    points: [
      "12 guided modules, EN / Hinglish / हिंदी",
      "Live mentor sessions + monthly championship",
      "Candlestick & chart pattern library (90)",
      "Slide decks, key notes, quizzes",
    ],
    href: "/learn",
  },
  {
    no: 3,
    live: true,
    name: "CIRCLE O.N.E",
    subtitle: "A Complete Technical Study That Completes Your Journey",
    blurb:
      "76 chapters across Level 1 and Level 2 — theory, charting, classical & advanced patterns, cycles, Elliott, volatility, systems and quant. A 28-week guided batch with study plan, classroom and leaderboard.",
    points: [
      "76 chapters · 28-week guided batch",
      "Level 1 mock unlocks Level 2",
      "Practice MCQs + 10-question quiz per chapter",
      "Daily record, XP ladder, mentor mode",
    ],
    href: "/learn",
  },
  {
    no: 4,
    live: false,
    name: "CIRCLE PRO",
    subtitle: "Professional tracks · pick your specialisation",
    blurb:
      "The top of the ladder: the four professional specialisations, each a programme of its own, built on the CircleOptionLab platform's live tools.",
    points: [
      "Options Trading Mastery",
      "Futures & F&O Data Crunching",
      "Fundamental Analysis & Record Reading",
      "Trading Psychology Pro",
    ],
  },
];

export default function AcademyLanding() {
  return (
    <div className={s.wrap}>
      <header className={s.header}>
        <div className={s.brand}>
          <Image src={(process.env.NEXT_PUBLIC_BASE_PATH || "") + "/brand/logo.png"} alt="5 Circles" width={44} height={44} priority />
          <div className={s.brandName}>
            <span className={s.brandCo}>5 Circles Pvt Ltd</span>
            <span className={s.brandTitle}>5 Circles Academy</span>
          </div>
        </div>
        <Link href="/learn" className={`col-btn col-btn--primary ${s.enterBtn}`}>
          Have a code? Enter
        </Link>
      </header>

      <main className={s.main}>
        <p className={s.intro}>
          Four stages, one path. Each stage unlocks with its own access code, so you only pay for the
          stage you are on.
        </p>

        <div className={s.grid}>
          {STAGES.map((st) => (
            <section key={st.no} className={`${s.card} ${st.live ? s.cardLive : ""}`}>
              <div className={s.stageRow}>
                <span className={s.stageNo}>
                  <span className={s.stageDot}>{st.no}</span> Stage {st.no}
                </span>
                {st.live ? <span className={s.badgeLive}>Live now</span> : <span className={s.badgeSoon}>Coming soon</span>}
              </div>
              <h2 className={s.title}>{st.name}</h2>
              <p className={s.subtitle}>{st.subtitle}</p>
              <p className={s.blurb}>{st.blurb}</p>
              <ul className={s.list}>
                {st.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <div className={s.actions}>
                {st.live && st.href ? (
                  <>
                    <Link href={st.href} className="col-btn col-btn--primary w-full justify-center">
                      Open programme →
                    </Link>
                    <span className={s.codeNote}>Access code needed</span>
                  </>
                ) : (
                  <span className={`col-btn w-full justify-center ${s.soonBtn}`} aria-disabled>
                    Coming soon — opens with its own batch
                  </span>
                )}
              </div>
            </section>
          ))}
        </div>
      </main>

      <ComplianceFooter tier={1} grievance />
    </div>
  );
}

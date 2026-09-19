export const dynamic = "force-dynamic";
import Link from "next/link";
import { LEVELS, WEEKS, EXAMS, examKey, pick3, type ExamMeta } from "@/lib/content/course";
import { loadLearnerState } from "@/lib/progress/load";
import { gate, chainedLock, levelOpen, weekPct, stageSessions, isComplete, stateOf } from "@/lib/progress/gating";
import { SessionCard } from "@/components/ui/SessionCard";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Lock, ArrowUpRight } from "@/components/ui/Icon";
import { T } from "@/lib/i18n/strings";
import { t3, tr, type Lang } from "@/lib/i18n/lang";

const S = {
  eyebrow: t3("Stage 1 · CIRCLE S.M.A.R.T", "Stage 1 · CIRCLE S.M.A.R.T", "स्टेज 1 · CIRCLE S.M.A.R.T"),
  title: t3("Your path", "Aapka path", "आपका रास्ता"),
  certificate: t3("Certificate", "Certificate", "सर्टिफ़िकेट"),
  examAfter: t3("opens when this week's days are done", "is hafte ke saare din poore hone par khulega", "इस हफ़्ते के सारे दिन पूरे होने पर खुलेगा"),
  finalAfter: t3("opens when every day is done", "saare din poore hone par khulega", "सारे दिन पूरे होने पर खुलेगा"),
  readRules: t3("Read the rules", "Rules padhiye", "नियम पढ़िए"),
  attempted: t3("Attempted", "Attempt ho gaya", "अटेम्प्ट हो गया"),
  passed: t3("Passed", "Pass", "पास"),
  nextTitle: t3("After this stage", "Is stage ke baad", "इस स्टेज के बाद"),
  nextName: t3("Stage 2 · CIRCLE W.I.N.N.E.R.S", "Stage 2 · CIRCLE W.I.N.N.E.R.S", "स्टेज 2 · CIRCLE W.I.N.N.E.R.S"),
  nextBody: t3("The next stage of the 5 Circles Academy. It builds on these 21 days, and your mentor opens it for you once Stage 1 is complete.", "5 Circles Academy ka agla stage. Ye inhi 21 dinon par aage banta hai, aur Stage 1 poora hone ke baad aapke mentor ise aapke liye kholte hain.", "5 Circles Academy का अगला स्टेज। यह इन्हीं 21 दिनों पर आगे बनता है, और स्टेज 1 पूरा होने के बाद आपके मेंटर इसे आपके लिए खोलते हैं।"),
  nextOpen: t3("Your Stage 2 access is active.", "Aapka Stage 2 access active hai.", "आपका स्टेज 2 एक्सेस चालू है।"),
  goStage2: t3("Go to Stage 2", "Stage 2 par jaiye", "स्टेज 2 पर जाइए"),
  aboutStage2: t3("About Stage 2", "Stage 2 ke baare mein", "स्टेज 2 के बारे में"),
};
const intro = (w: number, n: number, days: boolean) => days
  ? t3(`${w} weeks, ${n} days, one day at a time. Submit a day's quiz and journal and the next day opens.`, `${w} hafte, ${n} din, ek din mein ek. Kisi din ka quiz aur journal submit kijiye, agla din khul jayega.`, `${w} हफ़्ते, ${n} दिन, एक दिन में एक। किसी दिन का क्विज़ और जर्नल सबमिट कीजिए, अगला दिन खुल जाएगा।`)
  : t3(`${w} weeks, ${n} sessions. Submit a session's quiz and journal and the next one opens.`, `${w} hafte, ${n} sessions. Kisi session ka quiz aur journal submit kijiye, agla khul jayega.`, `${w} हफ़्ते, ${n} सेशन। किसी सेशन का क्विज़ और जर्नल सबमिट कीजिए, अगला खुल जाएगा।`);
const unlocksWhen = (en: string, hi: string, dv: string) => t3(`Unlocks when your ${en} certificate is issued.`, `${hi} ka certificate milte hi ye khul jayega.`, `${dv} का सर्टिफ़िकेट मिलते ही यह खुल जाएगा।`);
const examTitle = (e: ExamMeta, lang: Lang) => { const x = e as ExamMeta & { title_hi?: string; title_dv?: string }; return tr({ en: x.title, hi: x.title_hi ?? x.title, dv: x.title_dv ?? "" }, lang); };

/** The course ladder: every level that has published sessions, week by week, with the Quiz Games in place and
 *  the next Academy stage at the end. Draft tiers (nothing published) stay off the page. Locked sessions say why. */
export default async function PathPage() {
  const { state, lang } = await loadLearnerState();
  const tx = (x: Parameters<typeof tr>[0]) => tr(x, lang);
  const levels = [...LEVELS].sort((a, b) => a.sequence - b.sequence).filter((lv) => stageSessions(state, lv.slug).length > 0);
  const all = levels.flatMap((lv) => stageSessions(state, lv.slug));
  const nWeeks = new Set(all.map((s) => `${s.level}-${s.week}`)).size;
  const stage2 = state.stages?.includes("winners");
  // One exam row: a link to its rules page once the work before it is done, otherwise when it opens.
  const examRow = (e: ExamMeta, ready: boolean) => {
    const res = state.exams?.[examKey(e)];
    return (
      <p className="lrn-muted" style={{ margin: "12px 0 0", fontSize: "var(--col-text-body-sm)" }}>
        <strong style={{ color: "var(--ink)" }}>{examTitle(e, lang)}</strong>{" · "}
        {res ? tx(res.passed ? S.passed : S.attempted) : ready ? null : tx(e.week ? S.examAfter : S.finalAfter)}
        {(ready || res) && <>{res ? " · " : ""}<Link href={`/learn/exam/${examKey(e)}`} className="lrn-link">{tx(S.readRules)}</Link></>}
      </p>
    );
  };
  return (
    <>
      <p className="col-eyebrow">{tx(S.eyebrow)}</p>
      <h1 className="lrn-title">{tx(S.title)}</h1>
      {all.length
        ? <p className="lrn-muted" style={{ marginTop: 0 }}>{tx(intro(nWeeks, all.length, all.every((s) => s.course_day)))}</p>
        : <div className="col-card col-empty"><p className="col-empty__title">{tx(T.emptyTitle)}</p><p style={{ margin: 0 }}>{tx(T.emptyBody)}</p></div>}
      {levels.map((lv) => {
        const open = levelOpen(state, lv.slug);
        const prev = LEVELS.find((l) => l.sequence === lv.sequence - 1);
        const ss = stageSessions(state, lv.slug);
        const final = EXAMS.find((e) => e.level === lv.slug && e.week === null);
        return (
          <section key={lv.slug} className="mt-6" aria-labelledby={`lv-${lv.slug}`}>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 id={`lv-${lv.slug}`} className="lrn-title" style={{ fontSize: 20, margin: 0 }}>{pick3(lv, "title", lang)}</h2>
              {!open && <span className="lrn-badge--hollow"><Lock size={12} aria-hidden />{tx(T.locked)}</span>}
              <span className="lrn-muted" style={{ fontSize: "var(--col-text-body-sm)", flexBasis: "100%" }}>{pick3(lv, "subtitle", lang)}</span>
              {!open && prev && <span className="lrn-muted" style={{ fontSize: "var(--col-text-body-sm)" }}>{tx(unlocksWhen(pick3(prev, "title", "en"), pick3(prev, "title", "hi"), pick3(prev, "title", "dv")))} <Link href="/learn/certificate" className="lrn-link">{tx(S.certificate)}</Link></span>}
            </div>
            {WEEKS.filter((w) => w.level === lv.slug).map((w) => {
              const ws = ss.filter((s) => s.week === w.number);
              if (!ws.length) return null;
              const pct = weekPct(state, lv.slug, w.number);
              const quiz = EXAMS.find((e) => e.level === lv.slug && e.week === w.number);
              return (
                // id = the anchor the Home wave journey links each week node to.
                <div key={w.number} id={`${lv.slug}-w${w.number}`} className="mt-4" style={{ scrollMarginTop: 96 }}>
                  <div className="flex items-center gap-3 mb-3">
                    <ProgressRing value={pct} size={44} stroke={4} label={`${tx(T.week)} ${w.number}`} />
                    <div><span className="col-eyebrow">{tx(T.week)} {w.number}</span><div style={{ fontWeight: 600 }}>{pick3(w, "title", lang)}</div></div>
                  </div>
                  <div className="lrn-grid">
                    {ws.map((s) => { const g = gate(state, s); return (
                      <Link key={s.number} href={`/learn/session/${s.number}`} className="lrn-cardlink">
                        <SessionCard s={s} g={g} lang={lang} why={!chainedLock(state, g)} />
                      </Link>); })}
                  </div>
                  {quiz && examRow(quiz, pct >= 100)}
                </div>
              );
            })}
            {final && examRow(final, ss.every((s) => isComplete(stateOf(state, s.number))))}
          </section>
        );
      })}

      {/* The Academy ladder continues outside this app: Stage 2 is a separate site, hence plain <a> (no /smart basePath). */}
      <section className="col-card mt-6" aria-labelledby="next-stage" style={{ padding: "var(--col-space-5)" }}>
        <p className="col-eyebrow" style={{ margin: 0 }}>{tx(S.nextTitle)}</p>
        <h2 id="next-stage" className="lrn-session__title" style={{ fontSize: 17, margin: "4px 0 6px" }}>{tx(S.nextName)}</h2>
        <p className="lrn-session__sub">{tx(stage2 ? S.nextOpen : S.nextBody)}</p>
        <p style={{ margin: "12px 0 0" }}>
          {stage2
            ? <a href="/winners/" className="col-btn col-btn--primary col-btn--sm">{tx(S.goStage2)} <ArrowUpRight size={14} aria-hidden /></a>
            : <a href="/winners/about/" className="col-btn col-btn--ghost col-btn--sm">{tx(S.aboutStage2)} <ArrowUpRight size={14} aria-hidden /></a>}
        </p>
      </section>
    </>
  );
}

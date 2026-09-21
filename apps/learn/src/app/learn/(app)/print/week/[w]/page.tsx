export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WEEKS } from "@/lib/content/course";
import { loadLearnerState } from "@/lib/progress/load";
import { isStage1Week, stage1Days, weekGate } from "@/lib/progress/stage1-access";
import { t3, tr, type Lang } from "@/lib/i18n/lang";
import { T } from "@/lib/i18n/strings";
import { LockedGate } from "@/components/ui/LockedGate";
import { Handout, S as H, type PrintDay } from "../../_components/Handout";
import { PrintBar } from "../../_components/PrintBar";
import { loadPrintDay, printLang, viewerIsStaff } from "../../_lib/load";

type Props = { params: Promise<{ w: string }>; searchParams: Promise<{ lang?: string | string[] }> };

const back = { href: "/learn/resources", label: t3("Resources", "Resources", "रिसोर्स") };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const w = Number((await params).w);
  const lang = printLang((await searchParams).lang, "en");
  return { title: `CIRCLE S.M.A.R.T · Stage 1 · Week ${w} handout (${tr(H.edition[lang], "en")}) · 5 Circles Pvt Ltd` };
}

/** Stage 1, one week, printable (A4, light): cover, contents, the week's days in order, the day-quiz answers and the
 *  disclaimer. scripts/export-stage1.mjs prints this page to CIRCLE-SMART_Week{N}_Handout_{EN,HINGLISH}.pdf.
 *  Access (lib/progress/stage1-access.ts): a learner once the week's first day is unlocked; staff always. */
export default async function PrintWeek({ params, searchParams }: Props) {
  const w = Number((await params).w);
  if (!Number.isInteger(w) || !isStage1Week(w)) notFound();
  const week = WEEKS.find((x) => x.level === "foundation" && x.number === w);
  if (!week) notFound();
  const [{ state, lang: uiLang }, staff, q] = await Promise.all([loadLearnerState(), viewerIsStaff(), searchParams]);
  const lang = printLang(q.lang, uiLang);
  const hrefFor = (l: Lang) => `/learn/print/week/${w}?lang=${l}`;

  const shut = weekGate(state, w, staff);
  if (shut) return <><PrintBar lang={lang} uiLang={uiLang} back={back} hrefFor={hrefFor} printable={false} /><LockedGate gate={shut} lang={uiLang} title={`${tr(T.week, uiLang)} ${w}: ${tr(H.handout, uiLang)}`} /></>;

  const days = (await Promise.all(stage1Days(state, w, staff).map((s) => loadPrintDay(s.number)))).filter((d): d is PrintDay => d !== null && (staff || d.s.is_published));
  if (!days.length) notFound();
  return <><PrintBar lang={lang} uiLang={uiLang} back={back} hrefFor={hrefFor} /><Handout mode="week" week={week} days={days} lang={lang} /></>;
}

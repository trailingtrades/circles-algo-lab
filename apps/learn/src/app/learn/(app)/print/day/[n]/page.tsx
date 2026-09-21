export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WEEKS, getSession } from "@/lib/content/course";
import { loadLearnerState } from "@/lib/progress/load";
import { dayGate, weekGate } from "@/lib/progress/stage1-access";
import { t3, tr, type Lang } from "@/lib/i18n/lang";
import { T } from "@/lib/i18n/strings";
import { LockedGate } from "@/components/ui/LockedGate";
import { Handout, S as H } from "../../_components/Handout";
import { PrintBar } from "../../_components/PrintBar";
import { loadPrintDay, printLang, viewerIsStaff } from "../../_lib/load";

type Props = { params: Promise<{ n: string }>; searchParams: Promise<{ lang?: string | string[] }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const n = Number((await params).n);
  const lang = printLang((await searchParams).lang, "en");
  return { title: `CIRCLE S.M.A.R.T · Stage 1 · Day ${n} handout (${tr(H.edition[lang], "en")}) · 5 Circles Pvt Ltd` };
}

/** One Stage 1 day, printable: the whole lesson (all five tabs) in reading order, its quiz without answers, the
 *  answers on the last pages, and the disclaimer. Open to a learner once the day is unlocked; staff always. */
export default async function PrintDayPage({ params, searchParams }: Props) {
  const n = Number((await params).n);
  const base = Number.isInteger(n) ? getSession(n) : null;
  if (!base || base.level !== "foundation") notFound();
  const week = WEEKS.find((x) => x.level === "foundation" && x.number === base.week);
  if (!week) notFound();
  const [{ state, lang: uiLang }, staff, q] = await Promise.all([loadLearnerState(), viewerIsStaff(), searchParams]);
  const lang = printLang(q.lang, uiLang);
  const back = { href: `/learn/session/${n}`, label: t3(`Back to Day ${base.course_day ?? n}`, `Day ${base.course_day ?? n} par wapas`, `दिन ${base.course_day ?? n} पर वापस`) };
  const wholeWeek = weekGate(state, base.week, staff) ? undefined : { href: `/learn/print/week/${base.week}?lang=${lang}`, label: t3(`Print the whole week ${base.week}`, `Poora week ${base.week} print kijiye`, `पूरा हफ़्ता ${base.week} प्रिंट कीजिए`) };
  const hrefFor = (l: Lang) => `/learn/print/day/${n}?lang=${l}`;

  const shut = dayGate(state, base, staff);
  if (shut) return <><PrintBar lang={lang} uiLang={uiLang} back={back} hrefFor={hrefFor} printable={false} /><LockedGate gate={shut} lang={uiLang} title={`${tr(T.day, uiLang)} ${base.course_day ?? n}: ${tr(H.handout, uiLang)}`} /></>;

  const day = await loadPrintDay(n);
  if (!day || (!staff && !day.s.is_published)) notFound();
  return <><PrintBar lang={lang} uiLang={uiLang} back={back} hrefFor={hrefFor} extra={wholeWeek} /><Handout mode="day" week={week} days={[day]} lang={lang} /></>;
}

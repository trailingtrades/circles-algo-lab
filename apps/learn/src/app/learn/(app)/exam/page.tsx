export const dynamic = "force-dynamic";
import Link from "next/link";
import { createClient, getViewer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { loadLearnerState } from "@/lib/progress/load";
import { currentLevel, dueExam, examTitle } from "@/lib/scoring/next";
import { examBand } from "@/lib/scoring/rules";
import { EXAMS, examKey, levelOf, pick3, type ExamMeta } from "@/lib/content/course";
import { T } from "@/lib/i18n/strings";
import { t3, tr, type L } from "@/lib/i18n/lang";
import { ArrowRight } from "@/components/ui/Icon";

const S = {
  title: t3("Exams", "Exams", "एग्ज़ाम"),
  lead: t3("Each exam is timed. Opening one shows its rules first; the timer starts only when you press Start.", "Har exam ka time fixed hai. Exam kholne par pehle uske rules dikhte hain; timer tabhi chalta hai jab aap 'Shuru kijiye' dabate hain.", "हर एग्ज़ाम का समय तय है। एग्ज़ाम खोलने पर पहले उसके नियम दिखते हैं; टाइमर तभी चलता है जब आप 'शुरू करें' दबाते हैं।"),
  week: t3("Week", "Week", "हफ़्ता"),
  final: t3("Final exam", "Final exam", "फ़ाइनल एग्ज़ाम"),
  notTaken: t3("Not taken yet", "Abhi nahi diya", "अभी नहीं दिया"),
  ready: t3("Ready to take", "Ab de sakte hain", "अब दे सकते हैं"),
  running: t3("Attempt in progress", "Attempt chal raha hai", "अटेम्प्ट चल रहा है"),
  passed: t3("Passed", "Pass", "पास"),
  distinction: t3("Distinction", "Distinction", "डिस्टिंक्शन"),
  retry: (n: number) => t3(`Not passed · attempts left: ${n}`, `Pass nahi hua · bache attempts: ${n}`, `पास नहीं हुआ · बचे अटेम्प्ट: ${n}`),
  noneLeft: t3("Not passed · no attempts left", "Pass nahi hua · attempts khatam", "पास नहीं हुआ · अटेम्प्ट खत्म"),
};
type Row = { id: string; week: number | null; attempts_allowed: number; total_marks: number; pass_marks: number; distinction_marks: number };
type Try = { exam_id: string; score: number | null; max_score: number | null; submitted_at: string | null };

/** All exams of the learner's current level with where they stand. Also the target of the certificate checklist's "Go" links (this route used to 404). */
export default async function ExamsPage() {
  const { state, demo, lang } = await loadLearnerState();
  const level = currentLevel(state), x = (l: L) => tr(l, lang);
  const exams = EXAMS.filter((e) => e.level === level);
  const rowOf = new Map<string, Row>(); let tries: Try[] = [];
  if (!demo && supabaseConfigured()) {
    const v = await getViewer(); const sb = await createClient();
    const { data: lv } = v ? await sb.from("levels").select("id").eq("slug", level).maybeSingle() : { data: null };
    if (v && lv) {
      const [{ data: rows }, { data: at }] = await Promise.all([
        sb.from("exams").select("id,week_id,attempts_allowed,total_marks,pass_marks,distinction_marks,weeks(number)").eq("level_id", lv.id),
        sb.from("attempts").select("exam_id,score,max_score,submitted_at").eq("user_id", v.id).not("exam_id", "is", null),
      ]);
      for (const r of rows ?? []) { const wk = r.week_id ? (r.weeks as unknown as { number: number } | null)?.number ?? null : null; const m = exams.find((e) => e.week === wk); if (m) rowOf.set(examKey(m), { ...(r as unknown as Row), week: wk }); }
      tries = (at ?? []) as Try[];
    }
  }
  const due = dueExam(state, level, new Set(exams.filter((e) => tries.some((t) => t.submitted_at && t.exam_id === rowOf.get(examKey(e))?.id)).map(examKey)));
  const status = (e: ExamMeta): string => {
    const row = rowOf.get(examKey(e)), mine = row ? tries.filter((t) => t.exam_id === row.id) : [], sub = mine.filter((t) => t.submitted_at);
    const marks = row ?? e, bands = sub.map((t) => examBand(Number(t.score ?? 0), Number(t.max_score ?? marks.total_marks), marks));
    if (bands.includes("distinction")) return x(S.distinction);
    if (bands.includes("pass")) return x(S.passed);
    if (mine.some((t) => !t.submitted_at)) return x(S.running);
    if (sub.length) { const left = (row?.attempts_allowed ?? e.attempts_allowed) - sub.length; return left > 0 ? x(S.retry(left)) : x(S.noneLeft); }
    return due && examKey(due) === examKey(e) ? x(S.ready) : x(S.notTaken);
  };
  return (
    <>
      <p className="col-eyebrow">{pick3(levelOf(level), "title", lang)}</p>
      <h1 className="lrn-title">{x(S.title)}</h1>
      <p className="lrn-muted" style={{ marginTop: 0 }}>{x(S.lead)}</p>
      <ul className="lrn-list mt-4">
        {exams.map((e) => (
          <li key={examKey(e)} className="col-card__inner lrn-res">
            <span>
              <strong>{examTitle(e, lang)}</strong><br />
              <span className="lrn-muted" style={{ fontSize: "var(--col-text-body-sm)" }}>{e.week ? `${x(S.week)} ${e.week}` : x(S.final)} · <span className="lrn-num">{e.time_limit_min}</span> {x(T.minutes)} · {status(e)}</span>
            </span>
            <Link href={`/learn/exam/${examKey(e)}`} className="col-btn col-btn--ghost col-btn--sm">{x(T.open)} <ArrowRight size={14} aria-hidden /></Link>
          </li>
        ))}
      </ul>
    </>
  );
}

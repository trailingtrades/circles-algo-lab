export const dynamic = "force-dynamic";
import { requireViewer } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/supabase/env";
import { scanText, scanJson } from "@/lib/compliance/scan";
import { SESSIONS, EXAMS, LEVELS, WEEKS, RESOURCES, examKey, quizPublic, quizAnswerKey, examPublic, examAnswerKey, type QuizQuestionPublic, type AnswerKey } from "@/lib/content/course";
import { T } from "@/lib/i18n/strings";
import { ShieldCheck, AlertTriangle } from "@/components/ui/Icon";

// Plain-text columns. *_dv columns may hold Devanagari; every other text column must stay Roman script.
const TEXT_COLS = ["title_en", "title_hi", "title_dv", "subtitle_en", "subtitle_hi", "subtitle_dv", "core_concept", "ai_lab", "psychology", "strategy", "summary_hi", "file_name", "note", "title"];
const JSON_COLS = ["content", "prompts"];
type Opt = { en?: string; hi?: string; dv?: string };

/** Compliance scan report (§7 admin): every learner-facing string in the DB + content JSON + UI copy, through the same rules as CI. */
export default async function CompliancePage() {
  // requireViewer() signals "not an admin" by throwing a redirect, so it must never sit inside a .catch (that let any signed-in user in).
  if (supabaseConfigured()) await requireViewer(["admin"]);
  const findings: { where: string; issue: string }[] = [];
  const add = (where: string, issues: string[]) => { for (const issue of issues) findings.push({ where, issue }); };
  const row = (where: string, r: Record<string, unknown>) => {
    for (const k of TEXT_COLS) if (typeof r[k] === "string" && r[k]) add(`${where} · ${k}`, scanText(r[k] as string, { romanOnly: !k.endsWith("_dv") }));
    for (const k of JSON_COLS) if (r[k] && typeof r[k] === "object") add(`${where} · ${k}`, scanJson(r[k]));
  };
  /** A question: stems/explanations by language; the correct option in full; wrong options may quote scam wording (context), so only script/emoji checks. */
  const question = (where: string, q: Record<string, unknown>, options: Opt[], correct: number, scam: boolean) => {
    for (const k of ["stem_en", "stem_hi", "stem_dv", "explanation_en", "explanation_hi", "explanation_dv"]) if (typeof q[k] === "string" && q[k]) add(`${where} · ${k}`, scanText(q[k] as string, { allowScamExample: scam, romanOnly: !k.endsWith("_dv") }));
    options.forEach((o, i) => { for (const l of ["en", "hi", "dv"] as const) if (o?.[l]) add(`${where} · option ${i + 1} ${l}`, scanText(o[l]!, { allowScamExample: scam || i !== correct, romanOnly: l !== "dv" })); });
  };
  const bank = (where: string, pub: QuizQuestionPublic[], key: AnswerKey[]) => pub.forEach((q, i) => question(`${where} · Q${i + 1}`, { ...q, ...key[i] }, q.options, key[i]?.correct_index ?? -1, false));

  for (const s of SESSIONS) { row(`content JSON · session ${s.number}`, s as unknown as Record<string, unknown>); bank(`content JSON · session ${s.number} quiz`, quizPublic(s.number), quizAnswerKey(s.number)); }
  for (const e of EXAMS) { add(`content JSON · exam ${e.title}`, scanText(e.title, { romanOnly: true })); bank(`content JSON · ${e.title}`, examPublic(examKey(e)), examAnswerKey(examKey(e))); }
  for (const l of LEVELS) row(`content JSON · level ${l.slug}`, l as unknown as Record<string, unknown>);
  for (const w of WEEKS) row(`content JSON · ${w.level} week ${w.number}`, w as unknown as Record<string, unknown>);
  RESOURCES.forEach((r, i) => row(`content JSON · resource ${i + 1}`, r as unknown as Record<string, unknown>));
  for (const [k, v] of Object.entries(T)) { add(`UI copy · ${k}`, scanText(`${v.en}\n${v.hi}`, { romanOnly: true })); add(`UI copy · ${k} (हिंदी)`, scanText(v.dv)); }

  let dbCount = 0;
  if (supabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient();
    const [{ data: sessions }, { data: qs }, { data: levels }, { data: weeks }, { data: exams }, { data: resources }] = await Promise.all([
      admin.from("sessions").select("*").order("number"),
      admin.from("quiz_questions").select("*").order("sequence"),
      admin.from("levels").select("*"), admin.from("weeks").select("*"), admin.from("exams").select("*"), admin.from("resources").select("*"),
    ]);
    for (const s of sessions ?? []) { dbCount++; row(`DB · session ${s.number}`, s); }
    for (const q of qs ?? []) { dbCount++; question(`DB · question ${String(q.id).slice(0, 8)}`, q, (q.options as Opt[]) ?? [], Number(q.correct_index), /kachra|scam|loot/i.test(String(q.explanation_en ?? ""))); }
    for (const l of levels ?? []) { dbCount++; row(`DB · level ${l.slug}`, l); }
    for (const w of weeks ?? []) { dbCount++; row(`DB · week ${w.number}`, w); }
    for (const e of exams ?? []) { dbCount++; row(`DB · exam ${String(e.id).slice(0, 8)}`, e); }
    for (const r of resources ?? []) { dbCount++; row(`DB · resource ${String(r.id).slice(0, 8)}`, r); }
  }
  return (
    <>
      <p className="col-eyebrow">Admin · Compliance scan</p>
      <h1 className="lrn-title">Compliance report</h1>
      <p className="lrn-muted" style={{ marginTop: 0 }}>Rules: banned promise phrases in English, Hinglish and हिंदी · printed repo / STT / RBI reference rates · Devanagari outside the हिंदी fields · emoji · 87.7% without the FY26 stamp · old F&amp;O stats. Wrong quiz options and labelled scam examples are context, same as CI.</p>
      <div className="col-card mt-4">
        {findings.length === 0 ? <p className="flex items-center gap-2" style={{ margin: 0, color: "var(--col-up-dark)", fontWeight: 600 }}><ShieldCheck size={20} aria-hidden /> Clean: {SESSIONS.length} JSON sessions with their quizzes, {EXAMS.length} exams, {Object.keys(T).length} UI strings{dbCount ? `, ${dbCount} DB rows` : ""} scanned.</p>
          : <><p className="flex items-center gap-2" style={{ margin: 0, color: "var(--col-warn, #f5a623)", fontWeight: 600 }}><AlertTriangle size={20} aria-hidden /> {findings.length} finding(s)</p><ul className="lrn-list mt-3">{findings.map((f, i) => <li key={i}><strong>{f.where}</strong>: {f.issue}</li>)}</ul></>}
      </div>
    </>
  );
}

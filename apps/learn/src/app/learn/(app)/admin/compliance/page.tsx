export const dynamic = "force-dynamic";
import { requireViewer } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/supabase/env";
import { scanText } from "@/lib/compliance/scan";
import { SESSIONS, EXAMS } from "@/lib/content/course";
import { T } from "@/lib/i18n/strings";
import { ShieldCheck, AlertTriangle } from "@/components/ui/Icon";

/** Compliance scan report (§7 admin): every learner-facing string in the DB + content JSON + UI copy, through the same rules as CI. */
export default async function CompliancePage() {
  await requireViewer(["admin"]).catch(() => undefined);
  const findings: { where: string; issue: string }[] = [];
  const check = (where: string, text: string, scam = false) => { for (const i of scanText(text, { allowScamExample: scam })) findings.push({ where, issue: i }); };
  for (const s of SESSIONS) check(`content JSON · session ${s.number}`, [s.title_en, s.title_hi, s.summary_hi, ...s.prompts.map((p) => p.body)].join("\n"));
  for (const e of EXAMS) check(`content JSON · exam ${e.title}`, e.title);
  for (const [k, v] of Object.entries(T)) check(`UI copy · ${k}`, `${v.en}\n${v.hi}`);
  let dbCount = 0;
  if (supabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient();
    const [{ data: sessions }, { data: qs }] = await Promise.all([admin.from("sessions").select("number,title_en,title_hi,summary_hi,prompts"), admin.from("quiz_questions").select("id,session_id,exam_id,stem_en,stem_hi,options,explanation_en,explanation_hi")]);
    for (const s of sessions ?? []) { dbCount++; check(`DB · session ${s.number}`, [s.title_en, s.title_hi, s.summary_hi, JSON.stringify(s.prompts)].join("\n")); }
    for (const q of qs ?? []) { dbCount++; const opts = (q.options as { en: string; hi: string; distractor?: boolean }[]) ?? []; check(`DB · question ${q.id.slice(0, 8)} stem/explanation`, [q.stem_en, q.stem_hi, q.explanation_en, q.explanation_hi].join("\n"), /kachra|scam|loot/i.test(q.explanation_en)); for (const o of opts) if (!o.distractor) check(`DB · question ${q.id.slice(0, 8)} correct option`, `${o.en}\n${o.hi}`); }
  }
  return (
    <>
      <p className="col-eyebrow">Admin · Compliance scan</p>
      <h1 className="lrn-title">Compliance report</h1>
      <p className="lrn-muted" style={{ marginTop: 0 }}>Rules: banned assured-returns phrases (EN + Hinglish) · Devanagari · emoji · 87.7 without the FY26 stamp · old F&O stats. Distractor options and labelled scam examples are context-classed, same as CI.</p>
      <div className="col-card mt-4">
        {findings.length === 0 ? <p className="flex items-center gap-2" style={{ margin: 0, color: "var(--col-up-dark)", fontWeight: 600 }}><ShieldCheck size={20} aria-hidden /> Clean — {SESSIONS.length} JSON sessions, {Object.keys(T).length} UI strings{dbCount ? `, ${dbCount} DB rows` : ""} scanned.</p>
          : <><p className="flex items-center gap-2" style={{ margin: 0, color: "var(--col-warn, #f5a623)", fontWeight: 600 }}><AlertTriangle size={20} aria-hidden /> {findings.length} finding(s)</p><ul className="lrn-list mt-3">{findings.map((f, i) => <li key={i}><strong>{f.where}</strong>: {f.issue}</li>)}</ul></>}
      </div>
    </>
  );
}

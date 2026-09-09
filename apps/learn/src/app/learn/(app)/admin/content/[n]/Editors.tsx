"use client";
import { useActionState } from "react";
import { saveSession, saveQuestion, deleteQuestion } from "../actions";

type S = { number: number; title_en: string; title_hi: string; core_concept: string; ai_lab: string; psychology: string; summary_hi: string; video_url: string | null; duration_min: number; is_published: boolean; is_draft: boolean; prompts: unknown };
type Q = { id: string; stem_en: string; stem_hi: string; options: { en: string; hi: string }[]; correct_index: number; explanation_en: string; explanation_hi: string; marks: number; difficulty: number; sequence: number };
const Field = ({ id, label, name, value, area, type = "text" }: { id: string; label: string; name: string; value?: string | number | null; area?: boolean; type?: string }) => (
  <div className="lrn-field"><label htmlFor={id}>{label}</label>{area ? <textarea id={id} name={name} className="col-input lrn-textarea" defaultValue={value ?? ""} /> : <input id={id} name={name} type={type} className="col-input" defaultValue={value ?? ""} />}</div>
);
export function SessionEditor({ s }: { s: S }) {
  const [st, action, pending] = useActionState(saveSession, {});
  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="number" value={s.number} />
      <div className="lrn-grid" style={{ gap: 12 }}>
        <Field id="te" label="Title (EN)" name="title_en" value={s.title_en} /><Field id="th" label="Title (Hinglish, Roman script)" name="title_hi" value={s.title_hi} />
        <Field id="cc" label="Core concept" name="core_concept" value={s.core_concept} /><Field id="al" label="AI Lab" name="ai_lab" value={s.ai_lab} /><Field id="ps" label="Psychology" name="psychology" value={s.psychology} />
        <Field id="vu" label="Video URL (YouTube unlisted)" name="video_url" value={s.video_url} /><Field id="dm" label="Duration (min)" name="duration_min" value={s.duration_min} type="number" />
      </div>
      <Field id="sh" label="Summary (Hinglish)" name="summary_hi" value={s.summary_hi} area />
      <Field id="pr" label="Prompts (JSON array of {title, level, platform, body})" name="prompts" value={JSON.stringify(s.prompts, null, 1)} area />
      <label className="lrn-check"><input type="checkbox" name="is_published" defaultChecked={s.is_published} /> Published (visible to learners)</label>
      <label className="lrn-check"><input type="checkbox" name="is_draft" defaultChecked={s.is_draft} /> Draft chip shown</label>
      {st.error && <p className="lrn-error" role="alert">{st.error}</p>}{st.ok && <p className="lrn-notice" role="status">{st.ok}</p>}
      <button className="col-btn col-btn--primary" disabled={pending}>Save session</button>
    </form>
  );
}
export function QuestionEditor({ sessionNumber, q }: { sessionNumber: number; q?: Q }) {
  const [st, action, pending] = useActionState(saveQuestion, {});
  const [ds, del, dp] = useActionState(deleteQuestion, {});
  const p = q?.id ?? "new";
  return (
    <div className="col-card__inner lrn-bar mt-3">
      <form action={action}>
        <input type="hidden" name="session_number" value={sessionNumber} />{q && <input type="hidden" name="id" value={q.id} />}
        <Field id={`${p}-se`} label="Stem (EN)" name="stem_en" value={q?.stem_en} /><Field id={`${p}-sh`} label="Stem (Hinglish)" name="stem_hi" value={q?.stem_hi} />
        <Field id={`${p}-op`} label='Options JSON: [{"en":"...","hi":"..."}, ...]' name="options" value={JSON.stringify((q?.options ?? [{ en: "", hi: "" }, { en: "", hi: "" }]).map((o) => ({ en: o.en, hi: o.hi })))} area />
        <div className="lrn-grid" style={{ gap: 12 }}>
          <Field id={`${p}-ci`} label="Correct index (0-based)" name="correct_index" value={q?.correct_index ?? 0} type="number" /><Field id={`${p}-mk`} label="Marks" name="marks" value={q?.marks ?? 1} type="number" /><Field id={`${p}-df`} label="Difficulty 1–3" name="difficulty" value={q?.difficulty ?? 1} type="number" /><Field id={`${p}-sq`} label="Sequence" name="sequence" value={q?.sequence ?? 0} type="number" />
        </div>
        <Field id={`${p}-ee`} label='Explanation (shown as "Recommended answer")' name="explanation_en" value={q?.explanation_en} area /><Field id={`${p}-eh`} label="Explanation (Hinglish, optional)" name="explanation_hi" value={q?.explanation_hi} area />
        <label className="lrn-check"><input type="checkbox" name="scam_example" /> This question quotes scam language as a labelled example (skips the banned-phrase scan; Devanagari and emoji still blocked)</label>
        {st.error && <p className="lrn-error" role="alert">{st.error}</p>}{st.ok && <p className="lrn-notice" role="status">{st.ok}</p>}
        <button className="col-btn col-btn--primary col-btn--sm" disabled={pending}>{q ? "Save question" : "Add question"}</button>
      </form>
      {q && <form action={del} className="mt-2"><input type="hidden" name="id" value={q.id} /><input type="hidden" name="session_number" value={sessionNumber} /><button className="col-btn col-btn--ghost col-btn--sm" disabled={dp}>Delete</button>{ds.error && <span className="lrn-error"> {ds.error}</span>}</form>}
    </div>
  );
}

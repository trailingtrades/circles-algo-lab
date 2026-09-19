"use client";
import { useActionState, useRef, useState } from "react";
import { saveSession, saveQuestion, deleteQuestion } from "../actions";
import { useKeepForm } from "@/components/admin/useKeepForm";

type S = { number: number; title_en: string; title_hi: string; title_dv?: string | null; core_concept: string; ai_lab: string; psychology: string; strategy?: string | null; summary_hi: string; video_url: string | null; duration_min: number; is_published: boolean; is_draft: boolean; prompts: unknown; content?: unknown };
type Opt = { en: string; hi: string; dv?: string };
type Q = { id: string; stem_en: string; stem_hi: string; stem_dv?: string | null; options: Opt[]; correct_index: number; explanation_en: string; explanation_hi: string; explanation_dv?: string | null; marks: number; difficulty: number; sequence: number };
const Field = ({ id, label, name, value, area, type = "text", hint, lang }: { id: string; label: string; name: string; value?: string | number | null; area?: boolean; type?: string; hint?: string; lang?: string }) => (
  <div className="lrn-field"><label htmlFor={id}>{label}</label>{area ? <textarea id={id} name={name} lang={lang} className="col-input lrn-textarea" defaultValue={value ?? ""} /> : <input id={id} name={name} type={type} lang={lang} className="col-input" defaultValue={value ?? ""} />}{hint && <span className="lrn-muted" style={{ fontSize: "var(--col-text-dense)" }}>{hint}</span>}</div>
);
const Msg = ({ st }: { st: { error?: string; ok?: string } }) => <>{st.error && <p className="lrn-error" role="alert">{st.error}</p>}{st.ok && <p className="lrn-notice" role="status">{st.ok}</p>}</>;

/** A JSON textarea with local Check / Format buttons, so syntax slips show up before a round trip. The server validates again. */
function JsonArea({ id, label, name, value, rows, hint }: { id: string; label: string; name: string; value: unknown; rows: number; hint: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (format: boolean) => {
    const el = ref.current; if (!el) return;
    if (!el.value.trim()) { setNote({ ok: true, text: "Empty: the stored value is kept." }); return; }
    try { const parsed = JSON.parse(el.value); if (format) el.value = JSON.stringify(parsed, null, 2); setNote({ ok: true, text: "Valid JSON." }); }
    catch (e) { setNote({ ok: false, text: (e as Error).message }); }
  };
  return (
    <div className="lrn-field">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} ref={ref} name={name} rows={rows} spellCheck={false} className="col-input lrn-textarea lrn-num" style={{ fontSize: 13, minHeight: rows * 18 }} defaultValue={value == null ? "" : JSON.stringify(value, null, 2)} onChange={() => setNote(null)} />
      <span className="lrn-muted" style={{ fontSize: "var(--col-text-dense)" }}>{hint}</span>
      <span className="lrn-actions mt-2"><button type="button" className="col-btn col-btn--ghost col-btn--sm" onClick={() => run(false)}>Check JSON</button><button type="button" className="col-btn col-btn--ghost col-btn--sm" onClick={() => run(true)}>Format</button>{note && <span className={note.ok ? "lrn-notice" : "lrn-error"} role="status">{note.text}</span>}</span>
    </div>
  );
}

export function SessionEditor({ s }: { s: S }) {
  const [st, action, pending] = useActionState(saveSession, {});
  const { ref, onSubmit } = useKeepForm(action);
  return (
    <form ref={ref} onSubmit={onSubmit} className="mt-3">
      <input type="hidden" name="number" value={s.number} />
      <div className="lrn-grid" style={{ gap: 12 }}>
        <Field id="te" label="Title (English)" name="title_en" value={s.title_en} /><Field id="th" label="Title (Hinglish, Roman script)" name="title_hi" value={s.title_hi} /><Field id="td" label="Title (हिंदी, Devanagari)" name="title_dv" value={s.title_dv} lang="hi" />
        <Field id="cc" label="Core concept" name="core_concept" value={s.core_concept} /><Field id="al" label="AI Lab" name="ai_lab" value={s.ai_lab} /><Field id="ps" label="Psychology" name="psychology" value={s.psychology} /><Field id="sg" label="Strategy (English, optional)" name="strategy" value={s.strategy} />
        <Field id="vu" label="Video URL (YouTube, unlisted)" name="video_url" value={s.video_url} hint="youtube.com/watch?v=..., youtu.be/... or an embed link" /><Field id="dm" label="Duration (min)" name="duration_min" value={s.duration_min} type="number" />
      </div>
      <JsonArea id="ct" name="content" label="Lesson content (JSON, v2)" value={s.content} rows={24} hint="topics, story, key_terms, mindmap, kaam, kaam_steps, outcome, tools, fun, journal_prompt, motivation, tags. Every text is a string or {en, hi, dv}. Format: docs/SMART_CONTENT_SCHEMA.md. Scanned for compliance on save." />
      <JsonArea id="pr" name="prompts" label="AI Lab prompts (JSON array of {title, level, platform, body})" value={s.prompts ?? []} rows={8} hint="title can be {en, hi, dv}; body stays English." />
      <Field id="sh" label="Internal summary (not shown to learners)" name="summary_hi" value={s.summary_hi} area />
      <label className="lrn-check"><input type="checkbox" name="is_published" defaultChecked={s.is_published} /> Published (visible to learners)</label>
      <label className="lrn-check"><input type="checkbox" name="is_draft" defaultChecked={s.is_draft} /> Show the draft label</label>
      <Msg st={st} />
      <button className="col-btn col-btn--primary" disabled={pending}>{pending ? "Saving" : "Save session"}</button>
    </form>
  );
}

export function QuestionEditor({ sessionNumber, q, nextSequence }: { sessionNumber: number; q?: Q; nextSequence?: number }) {
  const [st, action, pending] = useActionState(saveQuestion, {});
  const [ds, del, dp] = useActionState(deleteQuestion, {});
  const { ref, onSubmit } = useKeepForm(action, !q && st.ok);
  const p = q?.id ?? "new";
  const opts = q?.options ?? [];
  const slots = Math.min(6, Math.max(4, opts.length + (opts.length < 6 ? 1 : 0)));
  return (
    <div className="col-card__inner lrn-bar mt-3">
      <form ref={ref} onSubmit={onSubmit}>
        <input type="hidden" name="session_number" value={sessionNumber} />{q && <input type="hidden" name="id" value={q.id} />}
        <div className="lrn-grid" style={{ gap: 12 }}>
          <Field id={`${p}-se`} label="Question (English)" name="stem_en" value={q?.stem_en} area /><Field id={`${p}-sh`} label="Question (Hinglish)" name="stem_hi" value={q?.stem_hi} area /><Field id={`${p}-sd`} label="Question (हिंदी)" name="stem_dv" value={q?.stem_dv} area lang="hi" />
        </div>
        <fieldset className="mt-3" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="col-eyebrow">Options (select the correct one; leave extra rows empty)</legend>
          {Array.from({ length: slots }, (_, i) => (
            <div key={i} className="flex gap-2 items-center flex-wrap mt-2">
              <label className="lrn-check" style={{ margin: 0, minWidth: 90 }}><input type="radio" name="correct" value={i} defaultChecked={q ? q.correct_index === i : i === 0} /> {String.fromCharCode(65 + i)} correct</label>
              <input name={`opt_en_${i}`} className="col-input" style={{ flex: "1 1 180px" }} defaultValue={opts[i]?.en ?? ""} placeholder="English" aria-label={`Option ${String.fromCharCode(65 + i)} English`} />
              <input name={`opt_hi_${i}`} className="col-input" style={{ flex: "1 1 180px" }} defaultValue={opts[i]?.hi ?? ""} placeholder="Hinglish" aria-label={`Option ${String.fromCharCode(65 + i)} Hinglish`} />
              <input name={`opt_dv_${i}`} lang="hi" className="col-input" style={{ flex: "1 1 180px" }} defaultValue={opts[i]?.dv ?? ""} placeholder="हिंदी" aria-label={`Option ${String.fromCharCode(65 + i)} हिंदी`} />
            </div>
          ))}
        </fieldset>
        <div className="lrn-grid mt-3" style={{ gap: 12 }}>
          <Field id={`${p}-ee`} label="Explanation, English (shown after submitting)" name="explanation_en" value={q?.explanation_en} area /><Field id={`${p}-eh`} label="Explanation, Hinglish" name="explanation_hi" value={q?.explanation_hi} area /><Field id={`${p}-ed`} label="Explanation, हिंदी" name="explanation_dv" value={q?.explanation_dv} area lang="hi" />
        </div>
        <div className="lrn-grid" style={{ gap: 12 }}>
          <Field id={`${p}-mk`} label="Marks" name="marks" value={q?.marks ?? 1} type="number" /><Field id={`${p}-df`} label="Difficulty 1-3" name="difficulty" value={q?.difficulty ?? 1} type="number" /><Field id={`${p}-sq`} label="Position (0 = first)" name="sequence" value={q?.sequence ?? nextSequence ?? ""} type="number" hint={q ? undefined : "Defaults to the end of the list."} />
        </div>
        <label className="lrn-check"><input type="checkbox" name="scam_example" /> This question quotes scam wording as a labelled example (skips the banned-phrase check; script and emoji checks still run)</label>
        <Msg st={st} />
        <button className="col-btn col-btn--primary col-btn--sm" disabled={pending}>{q ? "Save question" : "Add question"}</button>
      </form>
      {q && <form action={del} onSubmit={(e) => { if (!confirm("Delete this question? Learners stop seeing it immediately.")) e.preventDefault(); }} className="mt-2"><input type="hidden" name="id" value={q.id} /><input type="hidden" name="session_number" value={sessionNumber} /><button className="col-btn col-btn--ghost col-btn--sm" disabled={dp}>Delete</button>{ds.error && <span className="lrn-error" role="alert"> {ds.error}</span>}</form>}
    </div>
  );
}

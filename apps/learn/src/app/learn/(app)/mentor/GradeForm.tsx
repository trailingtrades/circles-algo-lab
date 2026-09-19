"use client";
import { useActionState } from "react";
import { gradeArtefact } from "./actions";
import { useKeepForm } from "@/components/admin/useKeepForm";

export type LadderItem = { artefact: string; title: string };

/** Process grade (scored) + outcome sign (shown, never scored) + feedback. The artefact comes from the cohort level's
 *  ladder: a single-item ladder is fixed, a longer one gets a picker. `current` pre-fills a regrade. */
export function GradeForm({ userId, refId, ladder, current }: { userId: string; refId: string | null; ladder: LadderItem[]; current?: { artefact?: string; grade?: string; outcome?: string | null; feedback?: string | null } }) {
  const [s, action, pending] = useActionState(gradeArtefact, {});
  const { ref, onSubmit } = useKeepForm(action);
  const k = `${userId}-${refId ?? current?.artefact ?? "x"}`;
  if (!ladder.length) return <p className="lrn-muted">No artefacts are set up for this level.</p>;
  return (
    <form ref={ref} onSubmit={onSubmit} className="mt-3 flex gap-2 flex-wrap items-end">
      <input type="hidden" name="user_id" value={userId} /><input type="hidden" name="ref_id" value={refId ?? ""} />
      {ladder.length === 1 ? <input type="hidden" name="artefact" value={ladder[0].artefact} /> : (
        <div className="lrn-field" style={{ margin: 0 }}><label htmlFor={`a-${k}`}>Artefact</label><select id={`a-${k}`} name="artefact" className="col-input" defaultValue={current?.artefact ?? ladder[0].artefact}>{ladder.map((a) => <option key={a.artefact} value={a.artefact}>{a.title}</option>)}</select></div>
      )}
      <div className="lrn-field" style={{ margin: 0 }}><label htmlFor={`g-${k}`}>Process grade (scored)</label><select id={`g-${k}`} name="process_grade" className="col-input" defaultValue={current?.grade ?? "B"}>{["A", "B", "C", "D", "F"].map((g) => <option key={g}>{g}</option>)}</select></div>
      <div className="lrn-field" style={{ margin: 0 }}><label htmlFor={`o-${k}`}>Outcome (shown, never scored)</label><select id={`o-${k}`} name="outcome_sign" className="col-input" defaultValue={current?.outcome ?? ""}><option value="">—</option><option value="+">+</option><option value="-">−</option><option value="0">0</option></select></div>
      <div className="lrn-field" style={{ margin: 0, flex: "1 1 200px" }}><label htmlFor={`f-${k}`}>Feedback</label><input id={`f-${k}`} name="feedback" className="col-input" maxLength={1000} defaultValue={current?.feedback ?? ""} /></div>
      <button className="col-btn col-btn--primary" disabled={pending}>{current?.grade ? "Regrade" : "Grade"}</button>
      {s.error && <span className="lrn-error" role="alert">{s.error}</span>}{s.ok && <span className="lrn-notice" role="status">{s.ok}</span>}
    </form>
  );
}

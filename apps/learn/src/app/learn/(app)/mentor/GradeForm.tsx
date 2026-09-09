"use client";
import { useActionState } from "react";
import { gradeArtefact } from "./actions";
export function GradeForm({ userId, refId, artefact }: { userId: string; refId: string | null; artefact: string }) {
  const [s, action, pending] = useActionState(gradeArtefact, {});
  return (
    <form action={action} className="mt-3 flex gap-2 flex-wrap items-end">
      <input type="hidden" name="user_id" value={userId} /><input type="hidden" name="ref_id" value={refId ?? ""} /><input type="hidden" name="artefact" value={artefact} />
      <div className="lrn-field" style={{ margin: 0 }}><label htmlFor={`g-${refId}`}>Process grade (scored)</label><select id={`g-${refId}`} name="process_grade" className="col-input" defaultValue="B">{["A", "B", "C", "D", "F"].map((g) => <option key={g}>{g}</option>)}</select></div>
      <div className="lrn-field" style={{ margin: 0 }}><label htmlFor={`o-${refId}`}>Outcome (shown, never scored)</label><select id={`o-${refId}`} name="outcome_sign" className="col-input" defaultValue=""><option value="">—</option><option value="+">+</option><option value="-">−</option><option value="0">0</option></select></div>
      <div className="lrn-field" style={{ margin: 0, flex: "1 1 200px" }}><label htmlFor={`f-${refId}`}>Feedback</label><input id={`f-${refId}`} name="feedback" className="col-input" maxLength={1000} /></div>
      <button className="col-btn col-btn--primary" disabled={pending}>Grade</button>
      {s.error && <span className="lrn-error">{s.error}</span>}{s.ok && <span className="lrn-notice">{s.ok}</span>}
    </form>
  );
}

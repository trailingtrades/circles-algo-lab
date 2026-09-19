"use client";
import { useActionState } from "react";
import { createCohort } from "@/app/learn/(app)/admin/actions";
import { useKeepForm } from "./useKeepForm";
import { LEVEL_LABEL } from "./format";

export type MentorOption = { id: string; full_name: string; role: string };

export function CohortForm({ mentors = [] }: { mentors?: MentorOption[] }) {
  const [state, action, pending] = useActionState(createCohort, {});
  const { ref, onSubmit } = useKeepForm(action, state.ok);
  return (
    <form ref={ref} onSubmit={onSubmit} className="mt-3">
      <div className="lrn-field"><label htmlFor="name">Name</label><input id="name" name="name" className="col-input" placeholder="TDP-Foundation-Oct-2026" required /></div>
      <div className="lrn-field"><label htmlFor="level">Level</label>
        <select id="level" name="level" className="col-input">{Object.entries(LEVEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      <div className="lrn-field"><label htmlFor="starts_on">Starts on</label><input id="starts_on" name="starts_on" type="date" className="col-input" required /></div>
      <div className="lrn-field"><label htmlFor="ends_on">Ends on (optional)</label><input id="ends_on" name="ends_on" type="date" className="col-input" /></div>
      <div className="lrn-field"><label htmlFor="mentor_id">Mentor (optional)</label><MentorSelect id="mentor_id" mentors={mentors} /></div>
      {state.error && <p className="lrn-error" role="alert">{state.error}</p>}
      {state.ok && <p className="lrn-notice" role="status">{state.ok}</p>}
      <button type="submit" className="col-btn col-btn--primary" disabled={pending}>Create cohort</button>
    </form>
  );
}

export function MentorSelect({ id, mentors, value }: { id: string; mentors: MentorOption[]; value?: string | null }) {
  return (
    <select id={id} name="mentor_id" className="col-input" defaultValue={value ?? ""}>
      <option value="">No mentor</option>
      {mentors.map((m) => <option key={m.id} value={m.id}>{m.full_name || "(no name)"}{m.role === "admin" ? " (admin)" : ""}</option>)}
    </select>
  );
}

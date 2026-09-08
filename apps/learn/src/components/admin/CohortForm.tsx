"use client";
import { useActionState } from "react";
import { createCohort } from "@/app/learn/(app)/admin/actions";

export function CohortForm() {
  const [state, action, pending] = useActionState(createCohort, {});
  return (
    <form action={action} className="mt-3">
      <div className="lrn-field"><label htmlFor="name">Name</label><input id="name" name="name" className="col-input" placeholder="TDP-Foundation-Oct-2026" required /></div>
      <div className="lrn-field"><label htmlFor="level">Level</label>
        <select id="level" name="level" className="col-input"><option value="foundation">Foundation</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
      <div className="lrn-field"><label htmlFor="starts_on">Starts on</label><input id="starts_on" name="starts_on" type="date" className="col-input" required /></div>
      {state.error && <p className="lrn-error" role="alert">{state.error}</p>}
      {state.ok && <p className="lrn-notice" role="status">{state.ok}</p>}
      <button type="submit" className="col-btn col-btn--primary" disabled={pending}>Create cohort</button>
    </form>
  );
}

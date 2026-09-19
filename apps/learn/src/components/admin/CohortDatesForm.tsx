"use client";
import { useActionState } from "react";
import { setCohortDates } from "@/app/learn/(app)/admin/actions";
import { useKeepForm } from "./useKeepForm";

/** Inline batch-schedule editor on the cohort page: start + optional end date. */
export function CohortDatesForm({ cohortId, startsOn, endsOn }: { cohortId: string; startsOn: string; endsOn: string | null }) {
  const [state, action, pending] = useActionState(setCohortDates, {});
  const { ref, onSubmit } = useKeepForm(action);
  return (
    <form ref={ref} onSubmit={onSubmit} className="flex items-end gap-2 flex-wrap">
      <input type="hidden" name="cohort_id" value={cohortId} />
      <div className="lrn-field" style={{ margin: 0 }}><label htmlFor="cd-start">Starts</label><input id="cd-start" name="starts_on" type="date" className="col-input" defaultValue={startsOn} required style={{ width: 150 }} /></div>
      <div className="lrn-field" style={{ margin: 0 }}><label htmlFor="cd-end">Ends (optional)</label><input id="cd-end" name="ends_on" type="date" className="col-input" defaultValue={endsOn ?? ""} style={{ width: 150 }} /></div>
      <button type="submit" className="col-btn col-btn--primary" disabled={pending}>Save dates</button>
      {state.error && <p className="lrn-error" role="alert" style={{ margin: 0 }}>{state.error}</p>}
      {state.ok && <p className="lrn-notice" role="status" style={{ margin: 0 }}>{state.ok}</p>}
    </form>
  );
}

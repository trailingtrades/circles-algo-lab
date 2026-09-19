"use client";
import { useActionState } from "react";
import { setCohortMentor } from "@/app/learn/(app)/admin/actions";
import { useKeepForm } from "./useKeepForm";
import { MentorSelect, type MentorOption } from "./CohortForm";

/** Cohort page: who mentors this batch. Mentors see, grade and unlock stages only for cohorts assigned here. */
export function CohortMentorForm({ cohortId, mentorId, mentors }: { cohortId: string; mentorId: string | null; mentors: MentorOption[] }) {
  const [state, action, pending] = useActionState(setCohortMentor, {});
  const { ref, onSubmit } = useKeepForm(action);
  return (
    <form ref={ref} onSubmit={onSubmit} className="flex items-end gap-2 flex-wrap">
      <input type="hidden" name="cohort_id" value={cohortId} />
      <div className="lrn-field" style={{ margin: 0 }}><label htmlFor="cm-mentor">Mentor</label><MentorSelect id="cm-mentor" mentors={mentors} value={mentorId} /></div>
      <button type="submit" className="col-btn col-btn--primary" disabled={pending}>Save mentor</button>
      {state.error && <p className="lrn-error" role="alert" style={{ margin: 0 }}>{state.error}</p>}
      {state.ok && <p className="lrn-notice" role="status" style={{ margin: 0 }}>{state.ok}</p>}
      {mentors.length === 0 && <p className="lrn-muted" style={{ margin: 0 }}>No mentors yet. The master admin sets a mentor role on People &amp; logins.</p>}
    </form>
  );
}

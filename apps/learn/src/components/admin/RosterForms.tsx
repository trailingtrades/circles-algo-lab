"use client";
import { useActionState } from "react";
import { bulkInvite, reinvite, setStatus, moveCohort } from "@/app/learn/(app)/admin/actions";

export function BulkInviteForm({ cohortId }: { cohortId: string }) {
  const [state, action, pending] = useActionState(bulkInvite, {});
  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="cohort_id" value={cohortId} />
      <div className="lrn-field"><label htmlFor="rows">Paste rows</label><textarea id="rows" name="rows" className="col-input lrn-textarea" placeholder={"Priya Sharma, priya@example.com\nArjun Mehta, arjun@example.com"} /></div>
      <div className="lrn-field"><label htmlFor="csv">or upload CSV</label><input id="csv" name="csv" type="file" accept=".csv,text/csv" className="col-input" style={{ paddingTop: 7 }} /></div>
      {state.error && <p className="lrn-error" role="alert">{state.error}</p>}
      {state.ok && <p className="lrn-notice" role="status">{state.ok}</p>}
      <button type="submit" className="col-btn col-btn--primary" disabled={pending}>{pending ? "Sending invites" : "Send invites"}</button>
    </form>
  );
}

export function RosterActions({ userId, inviteId, status, cohorts, currentCohort }: { userId?: string; inviteId?: string; status?: string; cohorts: { id: string; name: string }[]; currentCohort: string }) {
  const [s1, statusAction, p1] = useActionState(setStatus, {});
  const [s2, moveAction, p2] = useActionState(moveCohort, {});
  const [s3, reinviteAction, p3] = useActionState(reinvite, {});
  const err = s1.error || s2.error || s3.error;
  const ok = s1.ok || s2.ok || s3.ok;
  return (
    <div className="lrn-actions">
      {inviteId && (
        <form action={reinviteAction}><input type="hidden" name="invite_id" value={inviteId} /><button className="col-btn col-btn--ghost col-btn--sm" disabled={p3}>Re-invite</button></form>
      )}
      {userId && (
        <>
          <form action={statusAction}>
            <input type="hidden" name="user_id" value={userId} />
            <input type="hidden" name="status" value={status === "suspended" ? "active" : "suspended"} />
            <button className="col-btn col-btn--ghost col-btn--sm" disabled={p1}>{status === "suspended" ? "Reactivate" : "Suspend"}</button>
          </form>
          {cohorts.length > 1 && (
            <form action={moveAction} className="flex gap-1">
              <input type="hidden" name="user_id" value={userId} />
              <select name="cohort_id" className="col-input" style={{ height: 30, fontSize: 13 }} defaultValue={currentCohort} aria-label="Move to cohort">
                {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button className="col-btn col-btn--ghost col-btn--sm" disabled={p2}>Move</button>
            </form>
          )}
        </>
      )}
      {err && <span className="lrn-error" role="alert">{err}</span>}
      {ok && <span className="lrn-notice" role="status">{ok}</span>}
    </div>
  );
}

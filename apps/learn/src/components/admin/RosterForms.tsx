"use client";
import { useActionState, useState } from "react";
import { bulkInvite, reinvite, setStatus, moveCohort, type InviteLink } from "@/app/learn/(app)/admin/actions";
import { useKeepForm } from "./useKeepForm";

export function BulkInviteForm({ cohortId }: { cohortId: string }) {
  const [state, action, pending] = useActionState(bulkInvite, {});
  // Clear the paste box only when every row went through; otherwise keep it so skipped rows can be fixed.
  const { ref, onSubmit } = useKeepForm(action, !!state.ok && !state.skipped?.length && state.ok);
  return (
    <form ref={ref} onSubmit={onSubmit} className="mt-3">
      <input type="hidden" name="cohort_id" value={cohortId} />
      <div className="lrn-field"><label htmlFor="rows">Paste rows</label><textarea id="rows" name="rows" className="col-input lrn-textarea" placeholder={"Priya Sharma, priya@example.com\nArjun Mehta, arjun@example.com"} /></div>
      <div className="lrn-field"><label htmlFor="csv">or upload CSV</label><input id="csv" name="csv" type="file" accept=".csv,text/csv" className="col-input" style={{ paddingTop: 7 }} /></div>
      {state.error && <p className="lrn-error" role="alert">{state.error}</p>}
      {state.ok && <p className="lrn-notice" role="status">{state.ok}</p>}
      {!!state.skipped?.length && (
        <details className="mt-2" open={state.skipped.length <= 5}>
          <summary className="lrn-muted" style={{ cursor: "pointer" }}>Skipped ({state.skipped.length})</summary>
          <ul className="lrn-list mt-2" style={{ fontSize: "var(--col-text-body-sm)" }}>{state.skipped.slice(0, 50).map((s, i) => <li key={i}>{s}</li>)}</ul>
        </details>
      )}
      <InviteLinks links={state.links} />
      <button type="submit" className="col-btn col-btn--primary mt-3" disabled={pending}>{pending ? "Creating invites" : "Create invites"}</button>
    </form>
  );
}

/** One-time invite links for the admin to send personally (e.g. on WhatsApp) when email is off or failed.
 *  They exist only in this page's memory: reload and they are gone (use Re-invite for a fresh one). */
export function InviteLinks({ links }: { links?: InviteLink[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  if (!links?.length) return null;
  const copy = async (key: string, text: string) => { try { await navigator.clipboard.writeText(text); setCopied(key); } catch { setCopied(null); } };
  const message = (l: InviteLink) => `Namaste ${l.name}, aapka Circle S.M.A.R.T account tayyar hai. Is link se apna password set kijiye (sirf ek baar chalega, 7 din mein expire hoga): ${l.link}`;
  return (
    <div className="col-card__inner lrn-bar mt-3" role="region" aria-label="Invite links to share">
      <p style={{ margin: 0, fontWeight: 600 }}>Share these links yourself ({links.length})</p>
      <p className="lrn-muted" style={{ margin: "4px 0 0", fontSize: "var(--col-text-body-sm)" }}>{links[0].why}. Each link works once and is shown only now; send it only to that person.</p>
      <ul className="lrn-list mt-2">
        {links.map((l) => (
          <li key={l.email} style={{ display: "grid", gap: 6 }}>
            <span><strong>{l.name}</strong> <span className="lrn-num lrn-muted">{l.email}</span></span>
            <input className="col-input lrn-num" readOnly value={l.link} aria-label={`Invite link for ${l.email}`} onFocus={(e) => e.currentTarget.select()} style={{ fontSize: 13 }} />
            <span className="lrn-actions">
              <button type="button" className="col-btn col-btn--ghost col-btn--sm" onClick={() => copy(`${l.email}:link`, l.link)}>{copied === `${l.email}:link` ? "Copied" : "Copy link"}</button>
              <button type="button" className="col-btn col-btn--ghost col-btn--sm" onClick={() => copy(`${l.email}:msg`, message(l))}>{copied === `${l.email}:msg` ? "Copied" : "Copy WhatsApp message"}</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RosterActions({ userId, inviteId, status, cohorts, currentCohort }: { userId?: string; inviteId?: string; status?: string; cohorts: { id: string; name: string }[]; currentCohort: string }) {
  const [s1, statusAction, p1] = useActionState(setStatus, {});
  const [s2, moveAction, p2] = useActionState(moveCohort, {});
  const [s3, reinviteAction, p3] = useActionState(reinvite, {});
  const { ref: moveRef, onSubmit: moveSubmit } = useKeepForm(moveAction);
  const err = s1.error || s2.error || s3.error;
  const ok = s1.ok || s2.ok || s3.ok;
  const suspend = status !== "suspended";
  return (
    <div className="lrn-actions">
      {inviteId && (
        <form action={reinviteAction}><input type="hidden" name="invite_id" value={inviteId} /><button className="col-btn col-btn--ghost col-btn--sm" disabled={p3}>New link</button></form>
      )}
      {userId && (
        <>
          <form action={statusAction} onSubmit={(e) => { if (suspend && !confirm("Suspend this account? They are signed out and cannot sign in until reactivated.")) e.preventDefault(); }}>
            <input type="hidden" name="user_id" value={userId} />
            <input type="hidden" name="status" value={suspend ? "suspended" : "active"} />
            <button className="col-btn col-btn--ghost col-btn--sm" disabled={p1}>{suspend ? "Suspend" : "Reactivate"}</button>
          </form>
          {cohorts.length > 1 && (
            <form ref={moveRef} onSubmit={moveSubmit} className="flex gap-1">
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
      {inviteId && <InviteLinks links={s3.links} />}
    </div>
  );
}

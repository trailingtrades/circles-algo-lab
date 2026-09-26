"use client";
import { useActionState } from "react";
import { setStageAccess, type StageState } from "./actions";
import { useKeepForm } from "@/components/admin/useKeepForm";
import { AlertCircle } from "@/components/ui/Icon";

/** Prepared on the server (IST dates, status against the server clock) so the row hydrates without a mismatch. */
export type GrantView = { stage: string; state: "active" | "scheduled" | "expired"; starts: string | null; ends: string | null; startsDay: string; endsDay: string; lastOpened: string | null };

const status = (g: GrantView) =>
  g.state === "expired" ? `Expired ${g.ends}` : g.state === "scheduled" ? `Starts ${g.starts}${g.ends ? `, till ${g.ends}` : ""}` : g.ends ? `Active till ${g.ends}` : "Active, no end date";

/** One student row: WINNERS / O.N.E grant, edit-dates and revoke controls. */
export function StageRow({ userId, name, grants }: { userId: string; name: string; grants: GrantView[] }) {
  const [state, action, pending] = useActionState<StageState, FormData>(setStageAccess, {});
  return (
    <tr>
      <td className="col-text"><strong>{name}</strong>{state.error && <span className="lrn-error" role="alert" style={{ display: "block" }}><AlertCircle size={14} aria-hidden /> {state.error}</span>}{state.ok && <span className="lrn-muted" role="status" style={{ display: "block", fontSize: "var(--col-text-dense)" }}>{state.ok}</span>}</td>
      {(["funda", "winners", "winners_plus", "one", "pro_options", "pro_plus"] as const).map((stage) => <StageCell key={stage} userId={userId} stage={stage} g={grants.find((x) => x.stage === stage)} action={action} pending={pending} />)}
    </tr>
  );
}

function StageCell({ userId, stage, g, action, pending }: { userId: string; stage: "funda" | "winners" | "winners_plus" | "one" | "pro_options" | "pro_plus"; g?: GrantView; action: (fd: FormData) => void; pending: boolean }) {
  const { ref, onSubmit } = useKeepForm(action);
  const label = stage === "one" ? "O.N.E" : stage === "pro_options" ? "PRO · Options 117" : stage === "funda" ? "F.U.N.D.A" : stage === "winners_plus" ? "W.I.N.N.E.R.S +" : stage === "pro_plus" ? "PRO+" : "WINNERS";
  const dates = (
    <>
      <input name="starts_at" type="date" className="col-input" style={{ width: 140, padding: "2px 6px" }} defaultValue={g?.startsDay ?? ""} aria-label={`${label} start date (optional)`} title="Start date (blank = from today)" />
      <input name="expires_at" type="date" className="col-input" style={{ width: 140, padding: "2px 6px" }} defaultValue={g?.endsDay ?? ""} aria-label={`${label} end date (optional)`} title="End date (blank = no expiry)" />
    </>
  );
  return (
    <td className="col-text">
      <form ref={ref} onSubmit={(e) => { const op = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value; if (op === "revoke" && !confirm(`Revoke ${label} access? The student loses access immediately.`)) { e.preventDefault(); return; } onSubmit(e); }} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <input type="hidden" name="user_id" value={userId} />
        <input type="hidden" name="stage" value={stage} />
        {g ? (
          <>
            <span className={g.state === "expired" ? "lrn-error" : "col-chip"}>{status(g)}</span>
            {g.lastOpened && <span className="lrn-muted" style={{ fontSize: "var(--col-text-dense)" }}>last opened {g.lastOpened}</span>}
            <details style={{ width: "100%" }}>
              <summary style={{ cursor: "pointer", fontSize: "var(--col-text-body-sm)" }}>Change dates</summary>
              <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>{dates}<button type="submit" name="op" value="update" className="col-btn col-btn--primary" disabled={pending}>Save dates</button></span>
            </details>
            <button type="submit" name="op" value="revoke" className="col-btn" disabled={pending}>Revoke</button>
          </>
        ) : (
          <>
            {dates}
            <button type="submit" name="op" value="grant" className="col-btn col-btn--primary" disabled={pending}>Grant</button>
          </>
        )}
      </form>
    </td>
  );
}

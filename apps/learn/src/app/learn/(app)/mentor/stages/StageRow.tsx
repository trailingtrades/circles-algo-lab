"use client";
import { useActionState } from "react";
import { setStageAccess, type StageState } from "./actions";
import { AlertCircle } from "@/components/ui/Icon";

type Grant = { stage: string; expires_at: string | null; starts_at?: string | null };
const d = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/** One student row: WINNERS / O.N.E grant-revoke controls with an optional expiry date. */
export function StageRow({ userId, name, grants }: { userId: string; name: string; grants: Grant[] }) {
  const [state, action, pending] = useActionState<StageState, FormData>(setStageAccess, {});
  const has = (s: string) => grants.find((g) => g.stage === s);
  return (
    <tr>
      <td className="col-text"><strong>{name}</strong>{state.error && <span className="lrn-error" role="alert" style={{ display: "block" }}><AlertCircle size={14} aria-hidden /> {state.error}</span>}{state.ok && <span className="lrn-muted" role="status" style={{ display: "block", fontSize: "var(--col-text-dense)" }}>{state.ok}</span>}</td>
      {(["winners", "one"] as const).map((stage) => {
        const g = has(stage);
        return (
          <td key={stage} className="col-text">
            <form action={action} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <input type="hidden" name="user_id" value={userId} />
              <input type="hidden" name="stage" value={stage} />
              {g ? (
                <>
                  <span className="col-chip">{g.starts_at && new Date(g.starts_at) > new Date() ? `from ${d(g.starts_at)}` : ""}{g.starts_at && new Date(g.starts_at) > new Date() && g.expires_at ? " · " : ""}{g.expires_at ? `till ${d(g.expires_at)}` : g.starts_at && new Date(g.starts_at) > new Date() ? "" : "open"}</span>
                  <button type="submit" name="op" value="revoke" className="col-btn" disabled={pending}>Revoke</button>
                </>
              ) : (
                <>
                  <input name="starts_at" type="date" className="col-input" style={{ width: 140, padding: "2px 6px" }} aria-label={`${stage} start date (optional)`} title="Start date (blank = aaj se)" />
                  <input name="expires_at" type="date" className="col-input" style={{ width: 140, padding: "2px 6px" }} aria-label={`${stage} end date (optional)`} title="End date (blank = kabhi nahi)" />
                  <button type="submit" name="op" value="grant" className="col-btn col-btn--primary" disabled={pending}>Grant</button>
                </>
              )}
            </form>
          </td>
        );
      })}
    </tr>
  );
}

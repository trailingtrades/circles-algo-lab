"use client";
import { useActionState } from "react";
import { setRole } from "@/app/learn/(app)/admin/actions";

/** Master-only role switch on the People page; the server action re-checks the master email. */
export function RoleForm({ userId, role }: { userId: string; role: string }) {
  const [state, action, pending] = useActionState(setRole, {});
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <select name="role" defaultValue={role} className="col-input" style={{ width: 110, padding: "2px 6px" }} aria-label="Role">
        <option value="student">student</option>
        <option value="mentor">mentor</option>
        <option value="admin">admin</option>
      </select>
      <button type="submit" className="col-btn" disabled={pending}>Set</button>
      {state.error && <span className="lrn-error" role="alert">{state.error}</span>}
      {state.ok && <span className="lrn-muted" role="status">{state.ok}</span>}
    </form>
  );
}

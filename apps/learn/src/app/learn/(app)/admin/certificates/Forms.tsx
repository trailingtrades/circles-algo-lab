"use client";
import { useActionState } from "react";
import { revoke, sweep, unlockLevel } from "./actions";
type C = { id: string; cert_no: string; issued_on: string; band: string; status: string; reason: string | null; pdf: boolean; name: string; level: string };
export function CertAdminForms({ certs, students }: { certs: C[]; students: { id: string; full_name: string }[] }) {
  const [ss, sweepAction, sp] = useActionState(sweep, {});
  const [us, unlockAction, up] = useActionState(unlockLevel, {});
  return (
    <div className="lrn-grid mt-4">
      <form action={sweepAction} className="col-card"><span className="col-eyebrow">Run issuance check</span><p className="lrn-session__sub">Issuance is automatic after each scoring event; this re-checks every active student for a level.</p>
        <div className="lrn-field mt-2"><label htmlFor="lv">Level</label><select id="lv" name="level" className="col-input"><option value="foundation">Foundation</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
        {ss.error && <p className="lrn-error">{ss.error}</p>}{ss.ok && <p className="lrn-notice">{ss.ok}</p>}<button className="col-btn col-btn--primary" disabled={sp}>Check now</button></form>
      <form action={unlockAction} className="col-card"><span className="col-eyebrow">Level override (audited)</span>
        <div className="lrn-field mt-2"><label htmlFor="st">Student</label><select id="st" name="user_id" className="col-input">{students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></div>
        <div className="lrn-field"><label htmlFor="ul">Unlock level</label><select id="ul" name="level" className="col-input"><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
        <div className="lrn-field"><label htmlFor="ur">Reason</label><input id="ur" name="reason" className="col-input" required minLength={5} /></div>
        {us.error && <p className="lrn-error">{us.error}</p>}{us.ok && <p className="lrn-notice">{us.ok}</p>}<button className="col-btn col-btn--navy" disabled={up}>Unlock</button></form>
      <section className="col-card" style={{ gridColumn: "1 / -1" }}><span className="col-eyebrow">Issued ({certs.length})</span>
        <div className="lrn-table-wrap mt-2"><table className="col-table"><thead><tr><th className="col-text">No.</th><th className="col-text">Learner</th><th className="col-text">Level</th><th>Issued</th><th>Band</th><th>Status</th><th>Action</th></tr></thead><tbody>
          {certs.map((c) => <RevokeRow key={c.id} c={c} />)}
          {certs.length === 0 && <tr><td colSpan={7} className="col-text lrn-muted">Abhi koi certificate issue nahi hua.</td></tr>}
        </tbody></table></div></section>
    </div>
  );
}
function RevokeRow({ c }: { c: C }) {
  const [s, action, p] = useActionState(revoke, {});
  return (
    <tr><td className="col-text lrn-num">{c.cert_no}</td><td className="col-text">{c.name}</td><td className="col-text">{c.level}</td><td className="col-num">{c.issued_on}</td><td className="col-text" style={{ textAlign: "center" }}>{c.band}</td><td className={`col-text ${c.status === "revoked" ? "lrn-status--suspended" : "lrn-status--active"}`} style={{ textAlign: "center" }}>{c.status}{c.reason && <div className="lrn-muted" style={{ fontSize: "var(--col-text-dense)" }}>{c.reason}</div>}</td>
      <td>{c.status === "issued" && <form action={action} className="flex gap-1"><input type="hidden" name="id" value={c.id} /><input name="reason" className="col-input" placeholder="Reason (required)" style={{ height: 30, fontSize: 13 }} required minLength={10} /><button className="col-btn col-btn--ghost col-btn--sm" disabled={p}>Revoke</button>{s.error && <span className="lrn-error">{s.error}</span>}</form>}</td></tr>
  );
}

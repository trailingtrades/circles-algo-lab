"use client";
import { useActionState } from "react";
import { upsertRow, deleteRow } from "./actions";
import type { Row } from "./page";

const F = ({ id, label, name, value, area, hint }: { id: string; label: string; name: string; value?: string | number | null; area?: boolean; hint?: string }) => (
  <div className="lrn-field"><label htmlFor={id}>{label}</label>{area ? <textarea id={id} name={name} className="col-input lrn-textarea" style={{ minHeight: 72 }} defaultValue={value ?? ""} /> : <input id={id} name={name} className="col-input" defaultValue={value ?? ""} />}{hint && <span className="lrn-muted" style={{ fontSize: "var(--col-text-dense)" }}>{hint}</span>}</div>
);
export function RowForm({ row }: { row?: Row }) {
  const [s, action, pending] = useActionState(upsertRow, {});
  const p = row?.id ?? "new";
  return (
    <form action={action} className="mt-3">
      {row && <input type="hidden" name="id" value={row.id} />}
      <input type="hidden" name="is_virtual" value="true" />
      <div className="lrn-grid" style={{ gap: 12 }}>
        <F id={`${p}-sym`} label="Symbol (NSE)" name="symbol" value={row?.symbol} hint="Virtual only. No quotes are fetched." />
        <F id={`${p}-ed`} label="Entry date (virtual)" name="entry_date" value={row?.entry_date} />
        <F id={`${p}-qty`} label="Qty (virtual)" name="qty" value={row?.qty} />
        <F id={`${p}-ep`} label="Entry price you noted (virtual)" name="entry_price" value={row?.entry_price} />
      </div>
      <F id={`${p}-w1`} label="Full Why 1 (business reason)" name="full_why" value={row?.full_why} area />
      <F id={`${p}-w2`} label="Full Why 2 (independent reason)" name="full_why_2" value={row?.full_why_2} area />
      <F id={`${p}-tr`} label="Top risk" name="top_risk" value={row?.top_risk} />
      <F id={`${p}-ra`} label="Your answer to that risk" name="risk_answer" value={row?.risk_answer} />
      <div className="lrn-grid" style={{ gap: 12 }}>
        <F id={`${p}-ps`} label="Price-stop" name="price_stop" value={row?.price_stop} />
        <F id={`${p}-rp`} label="Review point (date or trigger)" name="review_point" value={row?.review_point} />
      </div>
      <F id={`${p}-ws`} label="Why-stop (thesis breaks when...)" name="why_stop" value={row?.why_stop} />
      {s.error && <p className="lrn-error" role="alert">{s.error}</p>}{s.ok && <p className="lrn-notice" role="status">{s.ok}</p>}
      <button className="col-btn col-btn--primary" disabled={pending}>{row ? "Save row" : "Add row"}</button>
    </form>
  );
}
export function DeleteButton({ id }: { id: string }) {
  const [s, action, pending] = useActionState(deleteRow, {});
  return <form action={action} className="mt-2"><input type="hidden" name="id" value={id} /><button className="col-btn col-btn--ghost col-btn--sm" disabled={pending}>Remove row</button>{s.error && <span className="lrn-error"> {s.error}</span>}</form>;
}

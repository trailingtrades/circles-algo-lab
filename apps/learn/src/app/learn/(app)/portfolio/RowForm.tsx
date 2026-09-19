"use client";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { upsertRow, deleteRow, type RowState } from "./actions";
import { useLang } from "@/lib/i18n/LangProvider";
import { t3, type L } from "@/lib/i18n/lang";
import type { Row } from "./page";

const S = {
  symbol: t3("Symbol (NSE)", "Symbol (NSE)", "सिंबल (NSE)"),
  symbolHint: t3("Virtual only. No live prices are fetched.", "Sirf virtual. Koi live price nahi aata.", "सिर्फ़ वर्चुअल। कोई लाइव कीमत नहीं आती।"),
  date: t3("Entry date (virtual)", "Entry date (virtual)", "एंट्री डेट (वर्चुअल)"),
  qty: t3("Qty (virtual)", "Qty (virtual)", "मात्रा (वर्चुअल)"),
  entry: t3("Entry price you noted (virtual)", "Aapne jo entry price note kiya (virtual)", "आपने जो एंट्री कीमत नोट की (वर्चुअल)"),
  why1: t3("Full Why 1 (business reason)", "Full Why 1 (business ka reason)", "फ़ुल व्हाई 1 (बिज़नेस का कारण)"),
  why2: t3("Full Why 2 (a second, independent reason)", "Full Why 2 (doosra, alag reason)", "फ़ुल व्हाई 2 (दूसरा, अलग कारण)"),
  risk: t3("Top risk", "Sabse bada risk", "सबसे बड़ा जोखिम"),
  answer: t3("Your answer to that risk", "Us risk ka aapka jawab", "उस जोखिम का आपका जवाब"),
  stop: t3("Price-stop", "Price-stop", "प्राइस-स्टॉप"),
  review: t3("Review point (date or trigger)", "Review point (date ya trigger)", "रिव्यू पॉइंट (तारीख़ या ट्रिगर)"),
  whyStop: t3("Why-stop (the idea is wrong if...)", "Why-stop (idea galat sabit hoga agar...)", "व्हाई-स्टॉप (आइडिया ग़लत साबित होगा अगर...)"),
  save: t3("Save row", "Row save kijiye", "रो सेव करें"),
  add: t3("Add row", "Row jodiye", "रो जोड़ें"),
  remove: t3("Remove row", "Row hataiye", "रो हटाएँ"),
  confirm: t3("Remove this row? Its notes will be deleted.", "Ye row hatani hai? Iske notes delete ho jayenge.", "यह रो हटानी है? इसके नोट्स डिलीट हो जाएँगे।"),
};

/** `err` is the id of the form's error line: a field the server rejected is marked invalid and points at it. */
type FieldProps = { id: string; label: L; name: string; value?: string | number | null; area?: boolean; hint?: L; type?: string; inputMode?: "numeric" | "decimal"; s: RowState; err: string };
function F({ id, label, name, value, area, hint, type, inputMode, s, err }: FieldProps) {
  const { tx } = useLang();
  const bad = s.field === name;
  const described = [hint && `${id}-hint`, bad && err].filter(Boolean).join(" ") || undefined;
  return (
    <div className="lrn-field"><label htmlFor={id}>{tx(label)}</label>
      {area ? <textarea id={id} name={name} className="col-input lrn-textarea" style={{ minHeight: 72 }} defaultValue={value ?? ""} aria-invalid={bad || undefined} aria-describedby={described} />
        : <input id={id} name={name} type={type ?? "text"} inputMode={inputMode} className="col-input" defaultValue={value ?? ""} aria-invalid={bad || undefined} aria-describedby={described} />}
      {hint && <span id={`${id}-hint`} className="lrn-muted" style={{ fontSize: "var(--col-text-dense)" }}>{tx(hint)}</span>}
    </div>
  );
}

export function RowForm({ row }: { row?: Row }) {
  const { tx } = useLang();
  const [s, action, pending] = useActionState(upsertRow, {});
  const [, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  const p = row?.id ?? "new";
  // A new row clears after it is saved; an edited row keeps what is on screen (it now matches the database).
  useEffect(() => { if (s.saved && !row) ref.current?.reset(); }, [s.saved, row]);
  return (
    // Submitted through a transition (not the form action) so React does not wipe what was typed when a check fails.
    <form ref={ref} action={action} onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); start(() => action(fd)); }} className="mt-3">
      {row && <input type="hidden" name="id" value={row.id} />}
      <input type="hidden" name="is_virtual" value="true" />
      <div className="lrn-grid" style={{ gap: 12 }}>
        <F s={s} err={`${p}-err`} id={`${p}-sym`} label={S.symbol} name="symbol" value={row?.symbol} hint={S.symbolHint} />
        <F s={s} err={`${p}-err`} id={`${p}-ed`} label={S.date} name="entry_date" value={row?.entry_date} type="date" />
        <F s={s} err={`${p}-err`} id={`${p}-qty`} label={S.qty} name="qty" value={row?.qty} inputMode="numeric" />
        <F s={s} err={`${p}-err`} id={`${p}-ep`} label={S.entry} name="entry_price" value={row?.entry_price} inputMode="decimal" />
      </div>
      <F s={s} err={`${p}-err`} id={`${p}-w1`} label={S.why1} name="full_why" value={row?.full_why} area />
      <F s={s} err={`${p}-err`} id={`${p}-w2`} label={S.why2} name="full_why_2" value={row?.full_why_2} area />
      <F s={s} err={`${p}-err`} id={`${p}-tr`} label={S.risk} name="top_risk" value={row?.top_risk} />
      <F s={s} err={`${p}-err`} id={`${p}-ra`} label={S.answer} name="risk_answer" value={row?.risk_answer} />
      <div className="lrn-grid" style={{ gap: 12 }}>
        <F s={s} err={`${p}-err`} id={`${p}-ps`} label={S.stop} name="price_stop" value={row?.price_stop} inputMode="decimal" />
        <F s={s} err={`${p}-err`} id={`${p}-rp`} label={S.review} name="review_point" value={row?.review_point} />
      </div>
      <F s={s} err={`${p}-err`} id={`${p}-ws`} label={S.whyStop} name="why_stop" value={row?.why_stop} />
      {s.error && <p id={`${p}-err`} className="lrn-error" role="alert">{s.error}</p>}
      {s.ok && <p className="lrn-notice" role="status">{s.ok}</p>}
      <button className="col-btn col-btn--primary" disabled={pending}>{tx(row ? S.save : S.add)}</button>
    </form>
  );
}
export function DeleteButton({ id }: { id: string }) {
  const { tx } = useLang();
  const [s, action, pending] = useActionState(deleteRow, {});
  return <form action={action} onSubmit={(e) => { if (!window.confirm(tx(S.confirm))) e.preventDefault(); }} className="mt-2"><input type="hidden" name="id" value={id} /><button className="col-btn col-btn--ghost col-btn--sm" disabled={pending}>{tx(S.remove)}</button>{s.error && <span className="lrn-error"> {s.error}</span>}</form>;
}

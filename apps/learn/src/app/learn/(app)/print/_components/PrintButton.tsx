"use client";
import { Download } from "@/components/ui/Icon";

/** Opens the browser's print dialog, where "Save as PDF" is one of the printers. The label comes translated from the server. */
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="col-btn col-btn--primary col-btn--sm" onClick={() => window.print()}>
      <Download size={14} aria-hidden /> {label}
    </button>
  );
}

import Link from "next/link";
import { ComplianceFooter } from "@/components/ui/ComplianceFooter";
import { HelpCircle } from "@/components/ui/Icon";
export default function NotFound() {
  return (
    <div className="lrn-shell">
      <main className="lrn-main flex items-center justify-center">
        <div className="col-card col-empty lrn-login">
          <HelpCircle size={36} strokeWidth={1.5} aria-hidden />
          <p className="col-empty__title">Page not found</p>
          <p style={{ margin: 0 }}>Ye page yahan nahi hai. Home par wapas chaliye.</p>
          <Link href="/learn/home" className="col-btn col-btn--primary mt-3">Go home</Link>
        </div>
      </main>
      <ComplianceFooter tier={1} />
    </div>
  );
}

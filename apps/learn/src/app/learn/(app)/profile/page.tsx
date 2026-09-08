import { User } from "@/components/ui/Icon";
export default function Page() {
  return (
    <>
      <div className="flex items-center gap-3 mb-4"><h1 className="lrn-title" style={{ margin: 0 }}>Profile</h1></div>
      <div className="col-card col-empty"><User size={36} strokeWidth={1.5} aria-hidden /><p className="col-empty__title">Coming in a later phase</p><p style={{ margin: 0 }}>Naam, cohort, language aur password Phase 2 mein aayenge.</p></div>
    </>
  );
}

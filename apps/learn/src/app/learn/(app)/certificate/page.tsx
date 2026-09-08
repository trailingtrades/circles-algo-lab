import { Shield } from "@/components/ui/Icon";
export default function Page() {
  return (
    <>
      <div className="flex items-center gap-3 mb-4"><h1 className="lrn-title" style={{ margin: 0 }}>Certificate</h1></div>
      <div className="col-card col-empty"><Shield size={36} strokeWidth={1.5} aria-hidden /><p className="col-empty__title">Coming in a later phase</p><p style={{ margin: 0 }}>Criteria checklist aur download Phase 5 mein aayega.</p></div>
    </>
  );
}

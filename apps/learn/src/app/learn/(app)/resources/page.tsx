import { Download } from "@/components/ui/Icon";
export default function Page() {
  return (
    <>
      <div className="flex items-center gap-3 mb-4"><h1 className="lrn-title" style={{ margin: 0 }}>Resources</h1></div>
      <div className="col-card col-empty"><Download size={36} strokeWidth={1.5} aria-hidden /><p className="col-empty__title">Coming in a later phase</p><p style={{ margin: 0 }}>Handouts, workbooks aur Algo Lab link Phase 3 mein aayenge.</p></div>
    </>
  );
}

import { IndianRupee } from "@/components/ui/Icon";
export default function Page() {
  return (
    <>
      <div className="flex items-center gap-3 mb-4"><h1 className="lrn-title" style={{ margin: 0 }}>Mock portfolio</h1><span className="lrn-virtual">VIRTUAL — no real money</span></div>
      <div className="col-card col-empty"><IndianRupee size={36} strokeWidth={1.5} aria-hidden /><p className="col-empty__title">Coming in a later phase</p><p style={{ margin: 0 }}>Rs 10 lakh virtual. Watchlist aur Full Why Phase 3 mein aayenge.</p></div>
    </>
  );
}

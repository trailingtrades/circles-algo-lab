import { BarChart } from "@/components/ui/Icon";
export default function Page() {
  return (
    <>
      <div className="flex items-center gap-3 mb-4"><h1 className="lrn-title" style={{ margin: 0 }}>Leaderboard</h1></div>
      <div className="col-card col-empty"><BarChart size={36} strokeWidth={1.5} aria-hidden /><p className="col-empty__title">Coming in a later phase</p><p style={{ margin: 0 }}>Process Score, Consistency aur Most Improved boards Phase 4 mein aayenge. Ye score aapke process ka hai — profit ka nahi.</p></div>
    </>
  );
}

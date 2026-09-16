import { Header } from "@/components/shell/Header";
import { Sidebar, BottomNav } from "@/components/shell/Nav";
import { ComplianceFooter } from "@/components/ui/ComplianceFooter";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { getViewer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const v = supabaseConfigured() ? await getViewer() : null;
  const name = v?.full_name?.split(" ")[0] || (supabaseConfigured() ? "" : "Priya"); // demo shows the same demo learner as home
  return (
    <div className="lrn-shell">
      <a href="#main" className="lrn-skip">Skip to content</a>
      <Header studentName={name} />
      <OfflineBanner />
      <div className="lrn-body">
        <Sidebar />
        <main className="lrn-main" id="main"><div className="lrn-max">{children}</div></main>
      </div>
      <ComplianceFooter tier={1} />
      <BottomNav />
    </div>
  );
}

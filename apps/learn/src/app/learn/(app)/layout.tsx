import { Header } from "@/components/shell/Header";
import { Sidebar, BottomNav } from "@/components/shell/Nav";
import { ComplianceFooter } from "@/components/ui/ComplianceFooter";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lrn-shell">
      <Header />
      <div className="lrn-body">
        <Sidebar />
        <main className="lrn-main" id="main">{children}</main>
      </div>
      <ComplianceFooter tier={1} />
      <BottomNav />
    </div>
  );
}

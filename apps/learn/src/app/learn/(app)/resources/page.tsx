export const dynamic = "force-dynamic";
import { LEVELS, WEEKS, RESOURCES } from "@/lib/content/course";
import { loadLearnerState } from "@/lib/progress/load";
import { levelOpen } from "@/lib/progress/gating";
import { Download, ExternalLink, Lock } from "@/components/ui/Icon";

/** Handouts, workbooks, exam papers, the mock-portfolio Excel, and the link out to the existing Algo Lab dashboard. Files are placeholders until uploaded (decision Q3-C). */
export default async function ResourcesPage() {
  const { state } = await loadLearnerState();
  const link = RESOURCES.find((r) => r.kind === "link");
  return (
    <>
      <h1 className="lrn-title">Resources</h1>
      {link && (
        <a href={link.storage_path!} target="_blank" rel="noopener noreferrer" className="col-card flex items-center justify-between gap-3 mt-4" style={{ textDecoration: "none", color: "inherit" }}>
          <div><strong>{link.file_name}</strong><div className="lrn-muted" style={{ fontSize: "var(--col-text-body-sm)" }}>{link.note}</div></div>
          <ExternalLink size={18} aria-hidden />
        </a>
      )}
      {LEVELS.map((lv) => {
        const open = levelOpen(state, lv.slug);
        const items = RESOURCES.filter((r) => r.level === lv.slug);
        return (
          <section key={lv.slug} className="col-card mt-4" aria-labelledby={`res-${lv.slug}`}>
            <div className="flex items-center gap-2"><h2 id={`res-${lv.slug}`} className="lrn-session__title">{lv.title_en}</h2>{!open && <span className="col-chip"><Lock size={12} aria-hidden /> Locked</span>}</div>
            <div className="lrn-table-wrap mt-3">
              <table className="col-table">
                <thead><tr><th className="col-text">File</th><th className="col-text">Kind</th><th className="col-text">Week</th><th className="col-text">Note</th><th>Get</th></tr></thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.file_name + r.week}>
                      <td className="col-text lrn-num">{r.file_name}</td>
                      <td className="col-text">{r.kind}</td>
                      <td className="col-text">{r.week ? `W${r.week} · ${WEEKS.find((w) => w.level === lv.slug && w.number === r.week)?.title_hi ?? ""}` : "Level"}</td>
                      <td className="col-text">{r.note}</td>
                      <td style={{ textAlign: "center" }}>{open && r.storage_path ? <a href={r.storage_path} className="col-btn col-btn--ghost col-btn--sm"><Download size={14} aria-hidden /> Download</a> : <span className="col-chip">{open ? "pending upload" : "locked"}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </>
  );
}

export const dynamic = "force-dynamic";
import { createClient, getViewer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { loadLearnerState } from "@/lib/progress/load";
import { nextSession } from "@/lib/progress/gating";
import { TIER2, CREDENTIAL_LINE } from "@/lib/compliance/strings";
import { BoardTabs, type BoardRow } from "./BoardTabs";

/** §10: Process Score only · cohort-scoped · top-10 named, others see own row + band · three boards · Tier-2 + credential line. */
export default async function LeaderboardPage() {
  const { state, demo, lang } = await loadLearnerState();
  const level = nextSession(state)?.level ?? "advanced";
  let process: BoardRow[] = [], consistency: BoardRow[] = [], improved: BoardRow[] = [];
  if (!demo && supabaseConfigured()) {
    const v = await getViewer(); const sb = await createClient();
    if (v) {
      const { data: lv } = await sb.from("levels").select("id").eq("slug", level).single();
      const [p, c, i] = await Promise.all([sb.rpc("board_process", { p_level: lv!.id }), sb.rpc("board_consistency"), sb.rpc("board_improved", { p_level: lv!.id })]);
      process = (p.data ?? []) as BoardRow[]; consistency = (c.data ?? []) as BoardRow[]; improved = (i.data ?? []) as BoardRow[];
    }
  } else {
    process = [{ rank: 1, display_name: "Arjun M.", value: 186, is_me: false, band: "Top 10" }, { rank: 2, display_name: "ProcessFirst", value: 172, is_me: false, band: "Top 10" }, { rank: 3, display_name: "Priya S.", value: 160, is_me: true, band: "Top 10" }, { rank: 4, display_name: "Neha K.", value: 151, is_me: false, band: "Top 10" }];
    consistency = [{ rank: 1, display_name: "Priya S.", value: 9, is_me: true, band: "Top 10" }, { rank: 2, display_name: "Arjun M.", value: 7, is_me: false, band: "Top 10" }];
    improved = [{ rank: 1, display_name: "Neha K.", value: 64, is_me: false, band: "Top 10" }, { rank: 2, display_name: "Priya S.", value: 48, is_me: true, band: "Top 10" }];
  }
  return (
    <>
      <p className="col-eyebrow">{level} · cohort board{demo && " · preview"}</p>
      <h1 className="lrn-title">Leaderboard</h1>
      <p className="lrn-muted" style={{ marginTop: 0 }}>Ye score aapke process ka hai — profit ka nahi.</p>
      <BoardTabs process={process} consistency={consistency} improved={improved} lang={lang} />
      <p className="lrn-muted mt-4" style={{ fontSize: "var(--col-text-dense)" }}>{lang === "hi" ? "Top 10 naam se dikhte hain; baaki sabko sirf apni row aur band dikhti hai. Ranks kabhi email ya WhatsApp par nahi bheje jaate." : "Top 10 are shown by name; everyone else sees only their own row and band. Ranks are never emailed or messaged."}</p>
      <p className="lrn-footer__cred mt-3" style={{ fontSize: "var(--col-text-dense)" }}>{CREDENTIAL_LINE}</p>
      <p className="lrn-muted" style={{ fontSize: "var(--col-text-dense)" }}>{TIER2}</p>
    </>
  );
}

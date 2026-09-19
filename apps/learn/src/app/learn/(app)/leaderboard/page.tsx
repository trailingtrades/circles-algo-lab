export const dynamic = "force-dynamic";
import { createClient, getViewer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { loadLearnerState } from "@/lib/progress/load";
import { currentLevel } from "@/lib/progress/gating";
import { levelOf, pick3 } from "@/lib/content/course";
import { T } from "@/lib/i18n/strings";
import { t3, tr } from "@/lib/i18n/lang";
import { TIER2 } from "@/lib/compliance/strings";
import { BoardTabs, type BoardRow } from "./BoardTabs";

const S = {
  eyebrow: t3("Your cohort", "Aapka batch", "आपका बैच"),
  sample: t3("sample data", "sample data", "सैंपल डेटा"),
  title: t3("Leaderboard", "Leaderboard", "लीडरबोर्ड"),
  privacy: t3("The top 10 are shown by name. Everyone else sees only their own row and band. Ranks are never emailed or sent on WhatsApp.", "Top 10 naam ke saath dikhte hain. Baaki sabko sirf apni row aur band dikhta hai. Rank kabhi email ya WhatsApp par nahi bheji jaati.", "टॉप 10 नाम के साथ दिखते हैं। बाकी सबको सिर्फ़ अपनी रो और बैंड दिखता है। रैंक कभी ईमेल या WhatsApp पर नहीं भेजी जाती।"),
};

/** §10: Process Score only (never money) · cohort-scoped · top-10 named, others see own row + band · three boards · Tier-2 (the footer carries the credential line). */
export default async function LeaderboardPage() {
  const { state, demo, lang } = await loadLearnerState();
  const level = currentLevel(state); // stays on Tier 1 after Tier 1 is done; never falls through to an empty Tier 3 board
  let process: BoardRow[] = [], consistency: BoardRow[] = [], improved: BoardRow[] = [];
  if (!demo && supabaseConfigured()) {
    const v = await getViewer(); const sb = await createClient();
    const { data: lv } = v ? await sb.from("levels").select("id").eq("slug", level).maybeSingle() : { data: null };
    if (lv) {
      const [p, c, i] = await Promise.all([sb.rpc("board_process", { p_level: lv.id }), sb.rpc("board_consistency"), sb.rpc("board_improved", { p_level: lv.id })]);
      process = (p.data ?? []) as BoardRow[]; consistency = (c.data ?? []) as BoardRow[]; improved = (i.data ?? []) as BoardRow[];
    }
  } else {
    process = [{ rank: 1, display_name: "Arjun M.", value: 186, is_me: false, band: "Top 10" }, { rank: 2, display_name: "ProcessFirst", value: 172, is_me: false, band: "Top 10" }, { rank: 3, display_name: "Priya S.", value: 160, is_me: true, band: "Top 10" }, { rank: 4, display_name: "Neha K.", value: 151, is_me: false, band: "Top 10" }];
    consistency = [{ rank: 1, display_name: "Priya S.", value: 9, is_me: true, band: "Top 10" }, { rank: 2, display_name: "Arjun M.", value: 7, is_me: false, band: "Top 10" }];
    improved = [{ rank: 1, display_name: "Neha K.", value: 64, is_me: false, band: "Top 10" }, { rank: 2, display_name: "Priya S.", value: 48, is_me: true, band: "Top 10" }];
  }
  return (
    <>
      <p className="col-eyebrow">{pick3(levelOf(level), "title", lang)} · {tr(S.eyebrow, lang)}{demo && ` · ${tr(S.sample, lang)}`}</p>
      <h1 className="lrn-title">{tr(S.title, lang)}</h1>
      <p className="lrn-muted" style={{ marginTop: 0 }}>{tr(T.rankNote, lang)}</p>
      <BoardTabs process={process} consistency={consistency} improved={improved} lang={lang} />
      <p className="lrn-muted mt-4" style={{ fontSize: "var(--col-text-dense)" }}>{tr(S.privacy, lang)}</p>
      <p className="lrn-muted mt-3" style={{ fontSize: "var(--col-text-dense)" }}>{TIER2}</p>
    </>
  );
}

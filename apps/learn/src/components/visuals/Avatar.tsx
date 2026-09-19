import type { Character, Mood } from "@/lib/content/visuals";

/* Flat, two-tone faces for the story panels. Drawn, not photos: the cast stays
   on-model in every lesson and costs nothing to load. Decorative (aria-hidden) —
   the speaker's name is printed beside the bubble. */
const SKIN: Record<Exclude<Character, "narrator">, string> = { mentor: "#c9905f", aman: "#b97a4f", priya: "#d39a6a", tipster: "#a8693f" };
const HAIR: Record<Exclude<Character, "narrator">, string> = { mentor: "#d5dbe3", aman: "#1d1a19", priya: "#211a17", tipster: "#2a2320" };
const SHIRT: Record<Exclude<Character, "narrator">, string> = { mentor: "#134A9A", aman: "#0f766e", priya: "#9f1239", tipster: "#4b5563" };

function mouth(m: Mood) {
  switch (m) {
    case "happy": return <path d="M26 44 Q32 50 38 44" fill="none" stroke="#3b1f12" strokeWidth="2.2" strokeLinecap="round" />;
    case "excited": return <path d="M25 43 Q32 53 39 43 Z" fill="#3b1f12" />;
    case "sad": return <path d="M26 48 Q32 42 38 48" fill="none" stroke="#3b1f12" strokeWidth="2.2" strokeLinecap="round" />;
    case "worried": return <path d="M26 46 q3-3 6 0 t6 0" fill="none" stroke="#3b1f12" strokeWidth="2.2" strokeLinecap="round" />;
    case "thinking": return <path d="M29 46 L37 44" fill="none" stroke="#3b1f12" strokeWidth="2.2" strokeLinecap="round" />;
    default: return <path d="M27 46 L37 46" fill="none" stroke="#3b1f12" strokeWidth="2.2" strokeLinecap="round" />;
  }
}
function brows(m: Mood) {
  if (m === "worried" || m === "sad") return <><path d="M20 26 L27 24" stroke="#2a1a12" strokeWidth="2" strokeLinecap="round" /><path d="M44 26 L37 24" stroke="#2a1a12" strokeWidth="2" strokeLinecap="round" /></>;
  if (m === "thinking") return <><path d="M20 25 L27 25" stroke="#2a1a12" strokeWidth="2" strokeLinecap="round" /><path d="M37 22 L44 24" stroke="#2a1a12" strokeWidth="2" strokeLinecap="round" /></>;
  if (m === "excited" || m === "happy") return <><path d="M20 24 Q23.5 21.5 27 24" fill="none" stroke="#2a1a12" strokeWidth="2" strokeLinecap="round" /><path d="M37 24 Q40.5 21.5 44 24" fill="none" stroke="#2a1a12" strokeWidth="2" strokeLinecap="round" /></>;
  return <><path d="M20 25 L27 24.5" stroke="#2a1a12" strokeWidth="2" strokeLinecap="round" /><path d="M37 24.5 L44 25" stroke="#2a1a12" strokeWidth="2" strokeLinecap="round" /></>;
}

export function Avatar({ who, mood = "neutral", size = 52 }: { who: Character; mood?: Mood; size?: number }) {
  if (who === "narrator") return null;
  const skin = SKIN[who], hair = HAIR[who], shirt = SHIRT[who];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden focusable="false" className="vz-ava">
      <circle cx="32" cy="32" r="31" fill="var(--panel-2)" stroke="var(--line)" />
      {/* shoulders */}
      <path d="M10 62 Q12 50 32 49 Q52 50 54 62 Z" fill={shirt} />
      {who === "mentor" && <path d="M28 50 L32 56 L36 50" fill="#ffffff" opacity=".9" />}
      {/* long hair behind the face */}
      {who === "priya" && <path d="M15 30 Q14 12 32 11 Q50 12 49 30 L50 50 Q44 46 44 40 L20 40 Q20 46 14 50 Z" fill={hair} />}
      {/* face */}
      <ellipse cx="32" cy="33" rx="14" ry="16" fill={skin} />
      {/* hair on top */}
      {who === "mentor" && <path d="M18 28 Q17 16 32 15 Q47 16 46 28 Q44 21 32 21 Q20 21 18 28 Z" fill={hair} />}
      {who === "aman" && <path d="M17 29 Q16 13 32 13 Q48 13 47 29 Q45 20 38 20 Q35 23 27 21 Q20 21 17 29 Z" fill={hair} />}
      {who === "priya" && <path d="M18 28 Q19 15 32 15 Q45 15 46 28 Q40 19 30 20 Q23 21 18 28 Z" fill={hair} />}
      {who === "tipster" && <><path d="M15 25 Q16 12 32 12 Q48 12 49 25 Z" fill="#b91c1c" /><path d="M44 24 L56 26 L44 27 Z" fill="#b91c1c" /></>}
      {/* eyes */}
      {who === "tipster" ? (
        <><rect x="19" y="28" width="11" height="7" rx="2.5" fill="#111827" /><rect x="34" y="28" width="11" height="7" rx="2.5" fill="#111827" /><path d="M30 31 L34 31" stroke="#111827" strokeWidth="1.6" /></>
      ) : (
        <>
          {brows(mood)}
          <circle cx="25" cy="32" r="2.1" fill="#1f130d" /><circle cx="39" cy="32" r="2.1" fill="#1f130d" />
          {who === "mentor" && <><circle cx="25" cy="32" r="5.2" fill="none" stroke="#1f2937" strokeWidth="1.5" /><circle cx="39" cy="32" r="5.2" fill="none" stroke="#1f2937" strokeWidth="1.5" /><path d="M30.2 32 L33.8 32" stroke="#1f2937" strokeWidth="1.5" /></>}
        </>
      )}
      {mouth(who === "tipster" && mood === "neutral" ? "happy" : mood)}
      {who === "tipster" && <path d="M24 55 Q32 60 40 55" fill="none" stroke="#f5a524" strokeWidth="2" />}
    </svg>
  );
}

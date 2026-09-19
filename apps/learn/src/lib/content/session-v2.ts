/* Session content, version 2: every learner-facing string in three languages, plus
 * teaching visuals. v1 rows (plain Hinglish strings, no visuals) still render — every
 * field is a `Text`, and tr() returns a bare string as-is — so a DB that has not been
 * re-seeded yet keeps working after this code ships. */
import type { Text } from "@/lib/i18n/lang";
import type { Visual, StoryV, MindmapV } from "./visuals";

export interface TopicV2 {
  h: Text;
  p: Text;
  /** "Example" box: a concrete Indian everyday case of the idea. */
  example?: Text;
  /** One-line takeaway shown under the topic. */
  remember?: Text;
  visual?: Visual;
}
export interface SessionContentV2 {
  v?: 2;
  /** Opening story (3-6 panels) shown at the top of the Learn tab. */
  story?: StoryV;
  topics: TopicV2[];
  key_terms?: { term: Text; meaning: Text }[];
  /** Recap mind-map at the end of the Learn tab. */
  mindmap?: MindmapV;
  /** Aaj Ka Kaam: a one-line brief plus a short checklist. */
  kaam: Text;
  kaam_steps?: Text[];
  kaam_min?: number;
  outcome: Text;
  tools: Text[];
  fun: Text | null;
  /** Compliance notes stay English, verbatim. */
  compliance: string | null;
  journal_prompt: Text;
  /** Closing line: mature, process-first, never a promise of returns. */
  motivation?: Text;
  /** Translated chips for the session header (core concept, AI lab, psychology). */
  tags?: { concept?: Text; ai_lab?: Text; psychology?: Text };
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/** Accepts v1 or v2 content from the DB/JSON and returns a safe v2 shape (never throws). */
export function normalizeContent(raw: unknown): SessionContentV2 {
  const c = isObj(raw) ? raw : {};
  const topics = Array.isArray(c.topics) ? (c.topics.filter(isObj) as unknown as TopicV2[]).filter((t) => t.h != null && t.p != null) : [];
  const arr = <T,>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);
  return {
    v: 2,
    story: isObj(c.story) && c.story.kind === "story" && Array.isArray(c.story.panels) ? (c.story as unknown as StoryV) : undefined,
    topics,
    key_terms: arr<{ term: Text; meaning: Text }>(c.key_terms).filter((k) => isObj(k) && k.term != null && k.meaning != null),
    mindmap: isObj(c.mindmap) && c.mindmap.kind === "mindmap" && Array.isArray(c.mindmap.branches) ? (c.mindmap as unknown as MindmapV) : undefined,
    kaam: (c.kaam as Text) ?? "",
    kaam_steps: arr<Text>(c.kaam_steps),
    kaam_min: typeof c.kaam_min === "number" ? c.kaam_min : undefined,
    outcome: (c.outcome as Text) ?? "",
    tools: arr<Text>(c.tools),
    fun: (c.fun as Text | null) ?? null,
    compliance: typeof c.compliance === "string" ? c.compliance : null,
    journal_prompt: (c.journal_prompt as Text) ?? "",
    motivation: (c.motivation as Text | undefined) ?? undefined,
    tags: isObj(c.tags) ? (c.tags as SessionContentV2["tags"]) : undefined,
  };
}

/** Visuals that need a renderer, in reading order — used by the content validator and the preview page. */
export function visualsOf(c: SessionContentV2): Visual[] {
  const out: Visual[] = [];
  if (c.story) out.push(c.story);
  for (const t of c.topics) if (t.visual) out.push(t.visual);
  if (c.mindmap) out.push(c.mindmap);
  return out;
}

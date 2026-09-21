/* Stage 1 class files (the week handouts and decks) that this app serves itself, to signed-in learners, from
 * apps/learn/files/stage1/ (never public/: a public file needs no sign-in). Written by scripts/export-stage1.mjs
 * (handout PDFs) and the deck builder (PPTX); listed by scripts/gen_content.py (STAGE1_V3_FILES) with the in-app
 * path "/learn/files/stage1/<name>"; streamed by app/learn/(app)/files/stage1/[file]/route.ts.
 *
 * SERVER-ONLY (node:fs). The production standalone build carries the folder through outputFileTracingIncludes in
 * next.config.ts; the systemd unit runs server.js with apps/learn as its working directory, as `next dev` and
 * `next start` do, so the folder is always ./files/stage1 relative to the working directory. */
import { existsSync, statSync } from "node:fs";
import path from "node:path";

/** In-app URL prefix of these files (before the /smart basePath). */
export const STAGE1_FILES_ROUTE = "/learn/files/stage1/";
export const STAGE1_FILES_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "files", "stage1");

/** Plain file names only (no folders, no dot-files, nothing that could climb out of the folder). */
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,150}\.(pdf|pptx)$/;

export const STAGE1_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

/** The file name when a storage_path points at this folder, else null. */
export function stage1FileName(storagePath: string | null | undefined): string | null {
  const p = storagePath?.trim() ?? "";
  if (!p.startsWith(STAGE1_FILES_ROUTE)) return null;
  const name = p.slice(STAGE1_FILES_ROUTE.length);
  return SAFE_NAME.test(name) ? name : null;
}

/** Absolute path of a served file, or null when the name is not a plain, allowed file name. */
export function stage1FilePath(name: string): string | null {
  if (!SAFE_NAME.test(name)) return null;
  const abs = path.join(STAGE1_FILES_DIR, name);
  return path.dirname(abs) === STAGE1_FILES_DIR ? abs : null;
}

/** The file is on disk (exported and shipped). A row that points here stays hidden from students until it is. */
export function stage1FileExists(name: string): boolean {
  const abs = stage1FilePath(name);
  // turbopackIgnore: the folder is traced on purpose by outputFileTracingIncludes (next.config.ts), not by these calls.
  if (!abs || !existsSync(/*turbopackIgnore: true*/ abs)) return false;
  try { return statSync(/*turbopackIgnore: true*/ abs).isFile(); } catch { return false; }
}

/** Week number in a Stage 1 file name ("CIRCLE-SMART_Week2_Handout_EN.pdf" -> 2), or null. */
export function stage1FileWeek(name: string): number | null {
  const m = name.match(/_Week(\d+)_/i);
  return m ? Number(m[1]) : null;
}

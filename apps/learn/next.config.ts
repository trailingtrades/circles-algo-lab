import type { NextConfig } from "next";
import path from "node:path";

// Self-hosted VPS build (deploy-smart-vps.yml) sets NEXT_PUBLIC_BASE_PATH=/smart so the whole app
// lives under learn.optionlab.co.in/smart/ behind nginx. Dev and other builds are untouched.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  // /content/*.json lives at the monorepo root (source of truth for course content); let Turbopack resolve it.
  turbopack: { root: path.join(__dirname, "..", "..") },
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
  // No "X-Powered-By: Next.js": it only tells a scanner which exploits to try.
  poweredByHeader: false,
  // Stops `next dev` from writing AGENTS.md / CLAUDE.md into this folder on every start.
  agentRules: false,
  ...(basePath ? { basePath } : {}),
  // Under a basePath the image optimizer strips the prefix from src and then fails to find the
  // file internally; the only images are three tiny logos, so skip optimization entirely there.
  ...(basePath ? { images: { unoptimized: true } } : {}),
  ...(process.env.NEXT_OUTPUT_STANDALONE ? { output: "standalone" as const } : {}),
  // Under /smart the VPS's own static landing is the front door; the app root (Academy ladder
  // duplicate) is skipped so /smart/ opens the programme itself.
  ...(basePath
    ? { redirects: async () => [{ source: "/", destination: "/learn", permanent: false }] }
    : {}),
};

export default nextConfig;

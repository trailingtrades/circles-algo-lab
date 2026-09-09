import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // /content/*.json lives at the monorepo root (source of truth for course content); let Turbopack resolve it.
  turbopack: { root: path.join(__dirname, "..", "..") },
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
};

export default nextConfig;

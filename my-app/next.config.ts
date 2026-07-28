import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    // Pin the workspace root so stray lockfiles outside the repo can't
    // change root inference (e.g. a pnpm-lock.yaml in the home directory).
    root: __dirname,
  },
};

export default nextConfig;

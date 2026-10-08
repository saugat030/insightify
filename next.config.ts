import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone with only the deps actually imported, so the runtime
  // image carries no devDependencies and no source. See docs/DEPLOY.md.
  output: "standalone",
};

export default nextConfig;

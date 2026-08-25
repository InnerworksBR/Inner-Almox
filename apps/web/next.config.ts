import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const rootEnvPath = resolve(import.meta.dirname, "../../.env");
if (existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

const nextConfig: NextConfig = {
  agentRules: false,
  poweredByHeader: false,
  reactStrictMode: true
};

export default nextConfig;

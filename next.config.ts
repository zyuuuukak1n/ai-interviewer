import type { NextConfig } from "next";

const basePath = process.env.BASE_PATH !== undefined ? process.env.BASE_PATH : "/tools/ai-interviewer";

const nextConfig: NextConfig = {
  basePath: basePath === "" ? undefined : basePath,
  assetPrefix: basePath === "" ? undefined : basePath,
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;


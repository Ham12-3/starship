import type { NextConfig } from "next";

const config: NextConfig = {
  output: "export", // fully static site, served from /out
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default config;

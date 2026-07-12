import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    staleTimes: {
      dynamic: 300,
      static: 300,
    },
  },
};

export default nextConfig;

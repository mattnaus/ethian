import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "imapflow",
    "nodemailer",
    "bullmq",
    "ioredis",
  ],
  experimental: {
    // Enable server actions (available by default in Next.js 15, but explicit for clarity)
  },
};

export default nextConfig;

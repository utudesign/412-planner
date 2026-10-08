import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "img.clerk.com" }] },
  // /projects/<uuid> is served by app/(app)/project-view (query ?id=). /projects/new stays a real page.
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [{ source: "/projects/:id([0-9a-fA-F-]{36})", destination: "/project-view?id=:id" }],
      fallback: [],
    };
  },
};

export default nextConfig;

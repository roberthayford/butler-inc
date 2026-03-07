import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/reserve/:slug",
        destination: "/butlers/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

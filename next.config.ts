import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // devIndicators intentionally omitted to avoid TypeScript type issues
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ermmhrjxxmukoclfxbmk.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;

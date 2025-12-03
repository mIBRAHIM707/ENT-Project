import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization for external sources
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/**",
      },
    ],
    // Cache optimized images for 30 days
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Enable AVIF for better compression
    formats: ["image/avif", "image/webp"],
  },
  // Optimize package imports to reduce bundle size
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tooltip",
    ],
  },
};

export default nextConfig;

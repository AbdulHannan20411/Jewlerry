import type { NextConfig } from "next";

// Derive the Supabase project hostname from the URL so next/image is
// allowed to optimize images served from Supabase Storage's public buckets
// (product images, banners, avatars). Payment proofs are never served this
// way — they stay behind signed URLs fetched server-side.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  typedRoutes: true,
  images: {
    qualities: [60, 75, 90],
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;

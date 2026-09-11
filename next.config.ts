import type { NextConfig } from "next";

// Derive the Supabase project hostname from the URL so next/image is
// allowed to optimize images served from Supabase Storage's public buckets
// (product images, banners, avatars). Payment proofs are never served this
// way — they stay behind signed URLs fetched server-side.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  typedRoutes: true,
  // Enables forbidden()/unauthorized() + forbidden.tsx/unauthorized.tsx,
  // used by lib/permissions for admin/role gating (still experimental in
  // Next 16.3, but stable enough for this use and gives proper dedicated
  // 403/401 UI segments instead of ad-hoc redirects).
  experimental: {
    authInterrupts: true,
  },
  images: {
    qualities: [60, 75, 90],
    remotePatterns: [
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      // supabase/seed.sql uses picsum.photos for placeholder product/banner
      // images — dev-only, never referenced by production data (admin
      // uploads go to Supabase Storage instead).
      ...(process.env.NODE_ENV === "development"
        ? [{ protocol: "https" as const, hostname: "picsum.photos" }]
        : []),
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

// Derive the Supabase project host/protocol from the URL so next/image is
// allowed to optimize images served from Supabase Storage — both public
// buckets (product images, banners, avatars) and the short-lived signed
// URLs used for the private payment-proofs bucket (admin payment review).
// Protocol is derived too (not hardcoded to https) since local dev talks to
// Supabase over plain http (127.0.0.1:54321).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseParsedUrl = supabaseUrl ? new URL(supabaseUrl) : undefined;
const supabaseHostname = supabaseParsedUrl?.hostname;
const supabaseProtocol: "http" | "https" = supabaseParsedUrl?.protocol === "http:" ? "http" : "https";

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
    // Next's image optimizer refuses to fetch from private/local IPs by
    // default (SSRF hardening) — local Supabase serves images from
    // 127.0.0.1, so this only needs relaxing in development. The hosted
    // Supabase project used in production is a public HTTPS domain.
    ...(process.env.NODE_ENV === "development" ? { dangerouslyAllowLocalIP: true } : {}),
    remotePatterns: [
      ...(supabaseHostname
        ? [
            {
              protocol: supabaseProtocol,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
            {
              protocol: supabaseProtocol,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/sign/**",
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

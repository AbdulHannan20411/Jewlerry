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

// Supabase JS (auth session refresh, direct client-side queries where RLS
// allows it, e.g. the storefront's own cart/product reads) calls out to
// the project's REST/Auth/Realtime endpoints directly from the browser,
// so the CSP's connect-src must allow both the http(s) API origin and its
// wss:// Realtime counterpart — even though this app doesn't use Realtime
// subscriptions itself, supabase-js opens the socket unconditionally.
const supabaseOrigin = supabaseHostname ? `${supabaseProtocol}://${supabaseHostname}` : "";
const supabaseWsOrigin = supabaseHostname ? `wss://${supabaseHostname}` : "";

const csp = [
  "default-src 'self'",
  // Next.js injects small inline bootstrap scripts (and dev-mode HMR
  // needs 'unsafe-eval'); no third-party script origins are used anywhere
  // in this app.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWsOrigin}`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  typedRoutes: true,
  // Next's dev server blocks cross-origin requests to dev-only assets
  // (HMR websocket, etc.) from any host other than localhost by default.
  // Testing from another device on the LAN (e.g. a phone) needs this
  // machine's LAN IP allow-listed — dev-only, has no effect in production.
  allowedDevOrigins: ["192.168.100.12"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
  experimental: {
    // Enables forbidden()/unauthorized() + forbidden.tsx/unauthorized.tsx,
    // used by lib/permissions for admin/role gating (still experimental
    // in Next 16.3, but stable enough for this use and gives proper
    // dedicated 403/401 UI segments instead of ad-hoc redirects).
    authInterrupts: true,
    // Server Actions default to a 1MB request body cap — every
    // file-upload action (payment proofs, product images, banners)
    // submits the file as FormData through a Server Action, and
    // MAX_IMAGE_SIZE_BYTES (constants/index.ts) already allows up to
    // 5MB, validated server-side in lib/storage/images.ts and
    // lib/storage/payment-proofs.ts. Without raising this, every upload
    // past 1MB was rejected by Next itself before that validation ever
    // ran, surfacing as a raw 500 instead of the friendly "Image must be
    // 5MB or smaller" message. 8mb leaves headroom for multipart
    // overhead (boundaries/headers) above the 5MB file limit.
    serverActions: {
      bodySizeLimit: "8mb",
    },
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

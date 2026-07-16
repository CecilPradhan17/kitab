import type { NextConfig } from "next";

// Proxies CloudFront-hosted media through this app's own origin, so requests
// that need `crossOrigin` (WebGL texture loads in Book3D.tsx / renderBook.ts)
// become same-origin instead of cross-site. Same-origin requests aren't
// subject to CORS at all — no Origin header sent, nothing for CDN cache
// variants or network-level interception to ever get wrong. This replaces
// a multi-day attempt to make the cross-site CORS-mode request itself
// reliable (CloudFront config, cache-key differentiation) that never fully
// succeeded despite the server side checking out correctly at every layer
// tested — see src/lib/mediaUrl.ts for the matching client-side rewrite.
//
// Required, no hardcoded fallback: this duplicates server/.env's
// CLOUDFRONT_DOMAIN, and a wrong/stale value would fail silently (proxy to
// a defunct distribution) rather than loudly, so it's better to fail at
// startup than guess. Set NEXT_PUBLIC_CLOUDFRONT_DOMAIN in .env.local.
const CLOUDFRONT_DOMAIN = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;
if (!CLOUDFRONT_DOMAIN) {
  throw new Error("NEXT_PUBLIC_CLOUDFRONT_DOMAIN is required — set it in .env.local");
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/media/:path*",
        destination: `https://${CLOUDFRONT_DOMAIN}/:path*`,
      },
    ];
  },
};

export default nextConfig;

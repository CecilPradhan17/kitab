// Matches next.config.ts's rewrites() — see that file for the full reasoning.
// Required, no hardcoded fallback, for the same reason as there: a stale
// value would silently proxy to the wrong place instead of failing loudly.
const CLOUDFRONT_DOMAIN = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;
if (!CLOUDFRONT_DOMAIN) {
  throw new Error("NEXT_PUBLIC_CLOUDFRONT_DOMAIN is required — set it in .env.local");
}

/**
 * Rewrites a CloudFront-hosted URL to this app's own same-origin /media
 * proxy, so a crossOrigin-mode request (WebGL texture loads) never has to
 * be cross-site. URLs from any other host — e.g. the Open Library fallback
 * used when cover ingest fails — pass through unchanged; they're irrelevant
 * to the CORS problem this exists for and don't need proxying.
 */
export function toMediaUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  if (parsed.hostname !== CLOUDFRONT_DOMAIN) return url;

  return `/media${parsed.pathname}${parsed.search}`;
}

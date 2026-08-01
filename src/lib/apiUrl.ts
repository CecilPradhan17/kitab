// The Express API base URL, shared by every client-side data module — the
// single place this is read from the environment.
//
// Required, no localhost fallback: a hardcoded `?? "http://localhost:4000"`
// (previously duplicated across six files) would make a production build
// with a missing NEXT_PUBLIC_API_URL silently talk to each visitor's own
// localhost instead of failing — the exact silent-misconfiguration failure
// mode next.config.ts / src/lib/mediaUrl.ts already refuse for the
// CloudFront domain, so the API URL gets the same treatment. For local dev,
// set NEXT_PUBLIC_API_URL=http://localhost:4000 in .env.local — the dev
// default belongs in the env file, not in source.
const url = process.env.NEXT_PUBLIC_API_URL;
if (!url) {
  throw new Error("NEXT_PUBLIC_API_URL is required — set it in .env.local");
}

export const API_URL: string = url;

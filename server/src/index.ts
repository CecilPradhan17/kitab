import "dotenv/config";
import { createApp } from "./app";

// Required in every environment. A few of these (S3_BUCKET_NAME,
// CLOUDFRONT_DOMAIN in lib/s3.ts) are read elsewhere with non-null
// assertions (`!`) — without this check, a missing value wouldn't crash at
// startup, it would silently produce the string "undefined" inside stored
// URLs (e.g. avatar_url) and only surface much later as a broken image.
// jwt.ts also self-checks JWT_SECRET at import time (defense in depth, in
// case that module is ever imported without going through index.ts), but
// this sweep is the canonical, complete check — it lists every missing var
// at once instead of failing on whichever one happens to be read first.
const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "JWT_SECRET",
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "S3_BUCKET_NAME",
  "CLOUDFRONT_DOMAIN",
] as const;

// Only required in production — app.ts falls back to localhost:3000 for
// FRONTEND_ORIGIN in dev, which is fine for local work.
const PRODUCTION_ONLY_ENV_VARS = ["FRONTEND_ORIGIN"] as const;

function validateEnv(): void {
  const required =
    process.env.NODE_ENV === "production"
      ? [...REQUIRED_ENV_VARS, ...PRODUCTION_ONLY_ENV_VARS]
      : REQUIRED_ENV_VARS;

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        `Set them in server/.env (see server/.env.example).`
    );
  }
}

validateEnv();

// Node >=15 already crashes the process on an unhandled promise rejection by
// default — registering this handler doesn't change that behavior, it just
// makes the log format explicit and the crash-loudly intent visible in code
// instead of relying on a runtime default the reader has to already know
// about. Failures should be loud, not silent.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  process.exit(1);
});

/**
 * Server entry point.
 *
 * index.ts is responsible only for starting the HTTP server. The app itself
 * (routes + middleware) is built in app.ts, so the two concerns stay separate.
 */
const app = createApp();

// Read the port from the environment, falling back to 4000 for local dev.
// (Next.js dev server uses 3000, so we avoid colliding with it.)
const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(`Kitab API listening on http://localhost:${PORT}`);
});

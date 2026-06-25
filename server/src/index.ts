import "dotenv/config";
import { createApp } from "./app";

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

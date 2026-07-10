import express, { type Express } from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { booksRouter } from "./routes/books";
import { bookSearchRouter } from "./routes/bookSearch";
import { usersRouter } from "./routes/users";

// Where browser requests are allowed to originate. Reads run server-to-server
// (Next RSC -> Express) and need no CORS, but the add-book modal calls Express
// from the browser, which is cross-origin. Defaults to the Next dev server;
// override with FRONTEND_ORIGIN in production (e.g. the Vercel URL).
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";

/**
 * Builds and configures the Express application.
 *
 * The app is created here, separate from index.ts (which starts the server),
 * so that the configured app can be imported directly in tests later without
 * actually opening a port.
 */
export function createApp(): Express {
  const app = express();

  // Allow the browser frontend to call this API cross-origin. Scoped to a single
  // known origin rather than "*" — we only serve our own frontend.
  app.use(cors({ origin: FRONTEND_ORIGIN }));

  // Parse JSON request bodies into req.body. Needed once we add write endpoints.
  app.use(express.json());

  // Health check — a trivial route to confirm the server is up and reachable.
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Feature routers, mounted under /api.
  app.use("/api/auth", authRouter);
  app.use("/api/books", booksRouter);
  app.use("/api/book-search", bookSearchRouter);
  app.use("/api/users", usersRouter);

  return app;
}

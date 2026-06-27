import express, { type Express } from "express";
import { booksRouter } from "./routes/books";
import { bookSearchRouter } from "./routes/bookSearch";

/**
 * Builds and configures the Express application.
 *
 * The app is created here, separate from index.ts (which starts the server),
 * so that the configured app can be imported directly in tests later without
 * actually opening a port.
 */
export function createApp(): Express {
  const app = express();

  // Parse JSON request bodies into req.body. Needed once we add write endpoints.
  app.use(express.json());

  // Health check — a trivial route to confirm the server is up and reachable.
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Feature routers, mounted under /api.
  app.use("/api/books", booksRouter);
  app.use("/api/book-search", bookSearchRouter);

  return app;
}

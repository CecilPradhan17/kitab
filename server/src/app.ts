import express, { type Express, type ErrorRequestHandler } from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { booksRouter } from "./routes/books";
import { bookSearchRouter } from "./routes/bookSearch";
import { usersRouter } from "./routes/users";
import { customBooksRouter } from "./routes/customBooks";

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
  app.use("/api/custom-books", customBooksRouter);

  // Terminal error handler — must be registered last, and must keep all 4
  // params (req/next unused, prefixed with _) since Express only recognizes
  // a handler as an error handler by its arity.
  //
  // Without this, any error that escapes a route's own try/catch falls
  // through to Express's built-in default handler, which includes the
  // error's stack trace in the response body unless NODE_ENV=production is
  // set. That's a real class of leak (file paths, query fragments, library
  // internals) sitting behind a single env var that's easy to forget to set
  // at deploy time. This handler removes that dependence entirely: it never
  // echoes err.message or err.stack back to the client, no matter the
  // environment — full detail still goes to the server logs via
  // console.error for debugging.
  app.use(((err, _req, res, _next) => {
    // express.json() throws a body-parser SyntaxError (type
    // "entity.parse.failed") when the request body isn't valid JSON. Checked
    // defensively (both the body-parser-specific `type` and a generic
    // SyntaxError-with-400-status shape) since we're relying on structural
    // properties of an error whose exact shape isn't part of any type we
    // import.
    const isJsonParseError =
      (err as { type?: string })?.type === "entity.parse.failed" ||
      (err instanceof SyntaxError && ((err as { status?: number; statusCode?: number }).status === 400 || (err as { status?: number; statusCode?: number }).statusCode === 400));

    if (isJsonParseError) {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }

    console.error("Unhandled error:", err);
    res.status(500).json({ error: "internal server error" });
  }) as ErrorRequestHandler);

  return app;
}

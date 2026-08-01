import express, { type Express, type ErrorRequestHandler } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
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

  // Hand-set security headers, deliberately not pulled in via helmet — this
  // API serves JSON only, so only a handful of helmet's headers are actually
  // meaningful here, and setting them by hand keeps the dependency count down
  // and every header individually explainable.
  app.use((_req, res, next) => {
    // Stops browsers MIME-sniffing a response into a different content type
    // than declared (e.g. treating a JSON body an attacker influenced as
    // HTML/script in some legacy scenarios).
    res.setHeader("X-Content-Type-Options", "nosniff");
    // This API's responses should never render inside an iframe; defense-in-
    // depth against clickjacking-style embedding even though the API serves
    // no HTML UI.
    res.setHeader("X-Frame-Options", "DENY");
    // Responses never need to leak referrer information anywhere; nothing
    // legitimate consumes it from this API.
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });

  // Health check — a trivial route to confirm the server is up and reachable.
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Coarse per-IP backstop against API hammering, layered UNDER the
  // per-route limiters (authLimiter, bookSearchLimiter, addBookLimiter,
  // avatarUploadLimiter, customCoverUploadLimiter) below — those stay the
  // tight line of defense for their specific expensive operations, and a
  // request has to pass BOTH its bucket and this general one. This one just
  // catches everything else (and everything in aggregate) that no single
  // route-specific limiter would.
  //
  // Skips public GET reads so anonymous visitors browsing a shared profile
  // are never throttled: the only GET routes under /users/ are the two
  // public profile reads (profile + books — every other /users operation is
  // POST/PATCH and auth-gated), and /book-search already has its own
  // stricter 30/min limiter, which this skip also keeps from double-counting
  // against this general bucket.
  //
  // Keyed by IP (the default keyGenerator) — same req.ip/trust-proxy caveat
  // as authLimiter in routes/auth.ts.
  const generalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please slow down and try again shortly" },
    skip: (req) =>
      req.method === "GET" && (req.path.startsWith("/users/") || req.path.startsWith("/book-search")),
  });
  app.use("/api", generalApiLimiter);

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

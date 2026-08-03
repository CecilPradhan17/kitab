import { Router } from "express";
import rateLimit from "express-rate-limit";
import { pool } from "../db";

/**
 * A single book-search result, trimmed to exactly what the add-book picker
 * needs. `source` tells the client (and POST /api/books) which catalog it
 * came from and which identifier to send back: `isbn` for an Open Library
 * result, `customBookId` for a user-submitted one.
 */
export type BookSearchResult =
  | { source: "openlibrary"; title: string; author: string; isbn: string; coverUrl: string }
  | { source: "custom"; title: string; author: string; customBookId: string; coverUrl: string };

/**
 * The handful of fields we read off an Open Library search document. Everything
 * is optional and loosely typed because this is an external API we don't
 * control — we validate/narrow each field before using it below.
 */
interface OpenLibraryDoc {
  title?: string;
  author_name?: string[];
  isbn?: string[];
  // Open Library's own signal that a cover actually exists for this doc -
  // more reliable than assuming every ISBN has one at the covers endpoint.
  cover_i?: number;
}

const OPEN_LIBRARY_SEARCH = "https://openlibrary.org/search.json";

// How many raw docs to request from Open Library.
const SEARCH_LIMIT = 10;

// Custom books are shown first and are meant to be a short, high-signal list
// (community contributions), not a second full catalog — capped well below
// the Open Library limit.
const CUSTOM_SEARCH_LIMIT = 5;

export const bookSearchRouter = Router();

// Keyed by IP (the default keyGenerator) — this route is unauthenticated, so
// there's no user id to key on (same situation as authLimiter in auth.ts).
// As-is, this endpoint is an open proxy: anyone can bounce arbitrary traffic
// through it straight to Open Library's public API, which must be closed
// before the app is publicly reachable. 30/min per IP is well above what one
// person typing in the add-book search box generates, but stops the endpoint
// being scripted as a free Open Library relay.
//
// Note: same deployment caveat as authLimiter — behind the production proxy
// (Railway/Render), req.ip only reflects the real client IP once
// app.set("trust proxy", 1) is configured in app.ts.
// An object `message` is sent as JSON by express-rate-limit, matching the
// { error } shape parseApiError expects — the library default is plain text.
const bookSearchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many searches. Please wait a minute and try again." },
});

// Simple substring match on title/author — no full-text search/ranking setup
// in this project (see CLAUDE.md's raw-SQL, no-ORM philosophy). Fine at the
// scale of a "community additions" table.
async function searchCustomBooks(q: string): Promise<BookSearchResult[]> {
  const result = await pool.query<{ id: string; title: string; author: string; coverUrl: string }>(
    `SELECT id, title, author, cover_url AS "coverUrl"
     FROM custom_books
     WHERE title ILIKE $1 OR author ILIKE $1
     ORDER BY title
     LIMIT $2;`,
    [`%${q}%`, CUSTOM_SEARCH_LIMIT]
  );

  return result.rows.map((row) => ({
    source: "custom" as const,
    title: row.title,
    author: row.author,
    customBookId: row.id,
    coverUrl: row.coverUrl,
  }));
}

async function searchOpenLibrary(q: string): Promise<BookSearchResult[]> {
  const url = new URL(OPEN_LIBRARY_SEARCH);
  url.searchParams.set("q", q);
  url.searchParams.set("fields", "title,author_name,isbn,cover_i");
  url.searchParams.set("limit", String(SEARCH_LIMIT));

  const response = await fetch(url, {
    // Open Library asks API clients to identify themselves with a User-Agent.
    headers: { "User-Agent": "Kitab/0.1 (book portfolio project)" },
  });

  if (!response.ok) {
    throw new Error(`Open Library search failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { docs?: OpenLibraryDoc[] };
  const docs = data.docs ?? [];

  // Shape each doc to what the picker needs, dropping anything missing the
  // essentials: a title, an author, at least one ISBN, and - per cover_i -
  // an actual cover image. No ISBN means nothing to POST; no cover_i means
  // the picker would show a broken/placeholder image, which is worse than
  // just not listing the result.
  const results: BookSearchResult[] = [];
  for (const doc of docs) {
    const isbn = doc.isbn?.[0];
    const author = doc.author_name?.[0];
    if (!doc.title || !author || !isbn || !doc.cover_i) continue;

    results.push({
      source: "openlibrary",
      title: doc.title,
      author,
      isbn,
      coverUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
    });
  }

  return results;
}

// GET /api/book-search?q=... — candidate list for the add-book picker: custom
// (community-submitted) books first, then Open Library results. This is
// catalog discovery (find a real book to add), NOT searching the user's own
// library.
//
// The two sources are queried concurrently (they're completely independent —
// one hits our own Postgres, the other Open Library's API — so the endpoint's
// latency is the slower of the two, not their sum) and each failure is
// contained: allSettled means an Open Library outage shouldn't hide our own
// custom books, and vice versa. The endpoint only fails outright if something
// goes wrong before either lookup even starts.
bookSearchRouter.get("/", bookSearchLimiter, async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  if (q === "") {
    return res.status(400).json({ error: "Query parameter q is required" });
  }

  const [customSettled, openLibrarySettled] = await Promise.allSettled([
    searchCustomBooks(q),
    searchOpenLibrary(q),
  ]);

  let customResults: BookSearchResult[] = [];
  if (customSettled.status === "fulfilled") {
    customResults = customSettled.value;
  } else {
    console.error("GET /api/book-search: custom book search failed:", customSettled.reason);
  }

  let openLibraryResults: BookSearchResult[] = [];
  if (openLibrarySettled.status === "fulfilled") {
    openLibraryResults = openLibrarySettled.value;
  } else {
    console.error("GET /api/book-search: Open Library search failed:", openLibrarySettled.reason);
  }

  // Dedupe across sources: a community-submitted book can also exist in Open
  // Library, and title+author is the only key the two sources share (custom
  // books have no ISBN). The custom entry wins — it's listed first and is the
  // copy other users' libraries already reference.
  const customKeys = new Set(
    customResults.map((r) => `${r.title.toLowerCase()}|${r.author.toLowerCase()}`)
  );
  const dedupedOpenLibrary = openLibraryResults.filter(
    (r) => !customKeys.has(`${r.title.toLowerCase()}|${r.author.toLowerCase()}`)
  );

  res.json([...customResults, ...dedupedOpenLibrary]);
});

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { pool } from "../db";
import { requireAuth } from "../middleware/requireAuth";
import { getOrIngestCover } from "../lib/coverIngest";

/**
 * The shape we return to clients. It mirrors the frontend `Book` type minus
 * `bookNumber` — that number isn't stored or sent; the frontend derives it from
 * the order books come back in. Defined here (rather than imported) because the
 * server is a separate package from the Next.js app; duplicating the shape is
 * the accepted cost of that separation. Could be shared via a package later.
 */
export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  // Larger variant for the 3D render (detail view + story export). Books
  // added before the cover-ingest pipeline existed have no stored
  // cover_texture_url, so the SQL layer falls back to coverUrl for them.
  textureUrl: string;
  // Raw dominant color, re-lit into the final spine tint on the frontend
  // (src/lib/coverColor.ts). Null for books added before this existed, or
  // where extraction found nothing to sample.
  spineColor: string | null;
  dateStarted: string;
  dateFinished: string;
  quote: string;
}

export const booksRouter = Router();

const MAX_QUOTE_LENGTH = 150; // mirrors the quote_length CHECK constraint (server/db/09_quote_length_constraint.sql)
const MAX_TITLE_LENGTH = 200; // mirrors the title_length CHECK constraint (server/db/11_title_length_constraint.sql)
const MAX_AUTHOR_LENGTH = 100; // mirrors the author_length CHECK constraint (server/db/12_author_length_constraint.sql)

// Keyed by user id (like avatarUploadLimiter in users.ts) — this route is
// already auth-gated, so the authenticated identity is the meaningful key,
// not IP. Only applied to POST: a never-before-seen ISBN on this route
// triggers an outbound Open Library fetch, sharp resizes, two S3 uploads, and
// a book_covers insert (getOrIngestCover), so an authenticated user hammering
// this endpoint can drive unbounded S3/DB growth. GET/PATCH/DELETE don't
// touch the ingest pipeline and stay unlimited. The limit is generous enough
// that no real user adding books to their library would ever hit it — this
// exists to cap ingest-pipeline abuse, not to throttle normal use.
const addBookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) => req.user!.userId,
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /api/books — the authenticated user's library, in reading order.
booksRouter.get("/", requireAuth, async (req, res) => {
  try {
    // Three deliberate things in this query:
    //  - Quoted aliases ("coverUrl"): Postgres lowercases unquoted identifiers,
    //    so the quotes are what preserve camelCase, making rows match the Book
    //    type with no mapping code.
    //  - date::text: returns clean "YYYY-MM-DD" strings instead of node-pg's
    //    default JS Date objects (which serialize to timestamps and can shift
    //    the day across timezones).
    //  - ORDER BY date_finished, created_at, id: the order the frontend numbers
    //    books by. created_at breaks date_finished ties (added-first wins); id
    //    is a final deterministic backstop.
    const result = await pool.query<Book>(
      `SELECT id, title, author,
              cover_url                              AS "coverUrl",
              COALESCE(cover_texture_url, cover_url) AS "textureUrl",
              spine_color                            AS "spineColor",
              date_started::text                     AS "dateStarted",
              date_finished::text                    AS "dateFinished",
              quote
       FROM books
       WHERE user_id = $1
       ORDER BY date_finished, created_at, id;`,
      [req.user!.userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/books failed:", err);
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

// Matches an ISO calendar date, e.g. "2024-05-12". The Date.parse guard rejects
// well-formatted-but-impossible dates like "2024-13-40".
function isISODate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

// Strips hyphens/spaces and uppercases (the ISBN-10 check digit can be "x"),
// so "978-0-13-468599-1" and "9780134685991" normalize to the same value.
// Validated against ISBN_PATTERN below before ever being used.
function normalizeIsbn(value: string): string {
  return value.trim().replace(/[- ]/g, "").toUpperCase();
}

// ISBN-10 (9 digits + a check digit that's 0-9 or X) or ISBN-13 (13 digits).
const ISBN_PATTERN = /^(\d{9}[\dX]|\d{13})$/;

// POST /api/books — add a book to the authenticated user's library.
//
// Body: { title, author, isbn?, customBookId?, dateStarted?, dateFinished?, quote? }.
// Exactly one of isbn (an Open Library book) or customBookId (a user-submitted
// book from custom_books) must be present — it's how the client tells the
// server which catalog this book came from. There's no book_number to set —
// it's derived on read from ordering.
booksRouter.post("/", requireAuth, addBookLimiter, async (req, res) => {
  const { title, author, isbn, customBookId, dateStarted, dateFinished, quote } = req.body ?? {};

  // Validate up front and reject with 400 before touching the DB. req.body is
  // untyped JSON, so every field is checked explicitly rather than trusted.
  const errors: string[] = [];
  if (typeof title !== "string" || title.trim() === "") errors.push("title is required");
  if (typeof title === "string" && title.length > MAX_TITLE_LENGTH) {
    errors.push(`title must be ${MAX_TITLE_LENGTH} characters or fewer`);
  }
  if (typeof author !== "string" || author.trim() === "") errors.push("author is required");
  if (typeof author === "string" && author.length > MAX_AUTHOR_LENGTH) {
    errors.push(`author must be ${MAX_AUTHOR_LENGTH} characters or fewer`);
  }

  const hasIsbn = typeof isbn === "string" && isbn.trim() !== "";
  const hasCustomBookId = typeof customBookId === "string" && customBookId.trim() !== "";
  if (hasIsbn === hasCustomBookId) {
    errors.push("exactly one of isbn or customBookId is required");
  }

  // Normalize + validate the ISBN shape here, before it ever flows into an S3
  // object key (covers/{isbn}/grid.webp in lib/coverIngest.ts), an outbound
  // fetch URL path, or the book_covers cache key — previously the raw
  // client-supplied string went straight into all three unvalidated.
  // Normalizing also dedupes hyphenated vs. bare forms of the same ISBN in
  // that cache instead of treating them as different books.
  const normalizedIsbn = hasIsbn ? normalizeIsbn(isbn) : "";
  if (hasIsbn && !ISBN_PATTERN.test(normalizedIsbn)) {
    errors.push("isbn must be a valid ISBN-10 or ISBN-13");
  }

  // Dates are optional, but if present must be valid ISO dates and ordered.
  if (dateStarted != null && !isISODate(dateStarted)) errors.push("dateStarted must be YYYY-MM-DD");
  if (dateFinished != null && !isISODate(dateFinished)) errors.push("dateFinished must be YYYY-MM-DD");
  if (isISODate(dateStarted) && isISODate(dateFinished) && dateFinished < dateStarted) {
    errors.push("dateFinished cannot be before dateStarted");
  }

  if (quote != null && typeof quote !== "string") errors.push("quote must be a string");
  if (typeof quote === "string" && quote.length > MAX_QUOTE_LENGTH) {
    errors.push(`quote must be ${MAX_QUOTE_LENGTH} characters or fewer`);
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: "Invalid book", details: errors });
  }

  // What actually gets inserted. Starts from the client's title/author/isbn,
  // but the customBookId branch below overwrites title/author/cover with the
  // shared catalog entry's own values — never the client's — so every library
  // row sourced from the same custom book stays identical to it everywhere.
  let bookTitle = title.trim();
  let bookAuthor = author.trim();
  let bookIsbn: string | null = null;
  let bookCustomBookId: string | null = null;
  let coverUrl: string;
  let textureUrl: string;
  let spineColor: string | null;

  try {
    if (hasIsbn) {
      // Use the normalized form, not the raw trim — this is what becomes the
      // S3 key / fetch path / cache key, so it must be canonical.
      bookIsbn = normalizedIsbn;
      // Fetch (or reuse a previously cached) S3/CloudFront cover for this
      // ISBN. Falls back to linking Open Library directly on any failure, so
      // this never fails the add-book request.
      ({ coverUrl, textureUrl, spineColor } = await getOrIngestCover(bookIsbn));
    } else {
      bookCustomBookId = customBookId.trim();
      const customBook = await pool.query<{ title: string; author: string; coverUrl: string; textureUrl: string; spineColor: string | null }>(
        `SELECT title, author, cover_url AS "coverUrl", texture_url AS "textureUrl", spine_color AS "spineColor"
         FROM custom_books WHERE id = $1;`,
        [bookCustomBookId]
      );
      if (customBook.rows.length === 0) {
        return res.status(404).json({ error: "Custom book not found" });
      }
      bookTitle = customBook.rows[0].title;
      bookAuthor = customBook.rows[0].author;
      coverUrl = customBook.rows[0].coverUrl;
      textureUrl = customBook.rows[0].textureUrl;
      spineColor = customBook.rows[0].spineColor;
    }

    const result = await pool.query<Book>(
      `INSERT INTO books (title, author, isbn, custom_book_id, cover_url, cover_texture_url, spine_color, date_started, date_finished, quote, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, title, author,
                 cover_url                              AS "coverUrl",
                 COALESCE(cover_texture_url, cover_url) AS "textureUrl",
                 spine_color                            AS "spineColor",
                 date_started::text                     AS "dateStarted",
                 date_finished::text                    AS "dateFinished",
                 quote;`,
      [
        bookTitle,
        bookAuthor,
        bookIsbn,
        bookCustomBookId,
        coverUrl,
        textureUrl,
        spineColor,
        dateStarted ?? null,
        dateFinished ?? null,
        quote ?? null,
        req.user!.userId,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    // 22P02 = invalid text representation — a malformed (non-UUID) customBookId.
    if (err instanceof Error && "code" in err && err.code === "22P02") {
      return res.status(400).json({ error: "Invalid customBookId" });
    }
    console.error("POST /api/books failed:", err);
    res.status(500).json({ error: "Failed to add book" });
  }
});

// PATCH /api/books/:id — edit a book's quote.
//
// Scoped to the quote alone: it's the only field the detail modal edits. A more
// general partial-update endpoint can come later if other fields become editable.
booksRouter.patch("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { quote } = req.body ?? {};

  // Quote stays required (every book has one) — reject empty just like add does.
  if (typeof quote !== "string" || quote.trim() === "") {
    return res.status(400).json({ error: "quote is required" });
  }
  if (quote.length > MAX_QUOTE_LENGTH) {
    return res.status(400).json({ error: `quote must be ${MAX_QUOTE_LENGTH} characters or fewer` });
  }

  try {
    const result = await pool.query<Book>(
      `UPDATE books
       SET quote = $1
       WHERE id = $2 AND user_id = $3
       RETURNING id, title, author,
                 cover_url                              AS "coverUrl",
                 COALESCE(cover_texture_url, cover_url) AS "textureUrl",
                 spine_color                            AS "spineColor",
                 date_started::text                     AS "dateStarted",
                 date_finished::text                    AS "dateFinished",
                 quote;`,
      [quote.trim(), id, req.user!.userId]
    );

    // rowCount 0 means either the id doesn't exist or it belongs to another user.
    // 404 either way — don't reveal ownership by returning 403.
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    // 22P02 = invalid text representation, i.e. id isn't a valid UUID. That's a
    // bad request, not a server fault.
    if (err instanceof Error && "code" in err && err.code === "22P02") {
      return res.status(400).json({ error: "Invalid book id" });
    }
    console.error("PATCH /api/books/:id failed:", err);
    res.status(500).json({ error: "Failed to update book" });
  }
});

// DELETE /api/books/:id — remove a book from the authenticated user's library.
//
// Just one row delete: book_number isn't stored, so there's no sequence to
// close up. The frontend re-derives numbers from order on its next fetch.
booksRouter.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM books WHERE id = $1 AND user_id = $2;",
      [id, req.user!.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    // Nothing meaningful to return — 204 signals success with no body.
    res.status(204).end();
  } catch (err) {
    // 22P02 = invalid text representation, i.e. id isn't a valid UUID.
    if (err instanceof Error && "code" in err && err.code === "22P02") {
      return res.status(400).json({ error: "Invalid book id" });
    }
    console.error("DELETE /api/books/:id failed:", err);
    res.status(500).json({ error: "Failed to delete book" });
  }
});

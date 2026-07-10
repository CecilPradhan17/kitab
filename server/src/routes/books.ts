import { Router } from "express";
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
  dateStarted: string;
  dateFinished: string;
  quote: string;
}

export const booksRouter = Router();

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

// POST /api/books — add a book to the authenticated user's library.
//
// Body: { title, author, isbn, dateStarted?, dateFinished?, quote? }. The client
// sends the ISBN it picked from search; the server derives the cover URL from it
// (single home for the Open Library URL scheme). There's no book_number to set —
// it's derived on read from ordering.
booksRouter.post("/", requireAuth, async (req, res) => {
  const { title, author, isbn, dateStarted, dateFinished, quote } = req.body ?? {};

  // Validate up front and reject with 400 before touching the DB. req.body is
  // untyped JSON, so every field is checked explicitly rather than trusted.
  const errors: string[] = [];
  if (typeof title !== "string" || title.trim() === "") errors.push("title is required");
  if (typeof author !== "string" || author.trim() === "") errors.push("author is required");
  if (typeof isbn !== "string" || isbn.trim() === "") errors.push("isbn is required");

  // Dates are optional, but if present must be valid ISO dates and ordered.
  if (dateStarted != null && !isISODate(dateStarted)) errors.push("dateStarted must be YYYY-MM-DD");
  if (dateFinished != null && !isISODate(dateFinished)) errors.push("dateFinished must be YYYY-MM-DD");
  if (isISODate(dateStarted) && isISODate(dateFinished) && dateFinished < dateStarted) {
    errors.push("dateFinished cannot be before dateStarted");
  }

  if (quote != null && typeof quote !== "string") errors.push("quote must be a string");

  if (errors.length > 0) {
    return res.status(400).json({ error: "Invalid book", details: errors });
  }

  // Fetch (or reuse a previously cached) S3/CloudFront cover for this ISBN.
  // Falls back to linking Open Library directly on any failure, so this never
  // fails the add-book request.
  const { coverUrl, textureUrl } = await getOrIngestCover(isbn.trim());

  try {
    const result = await pool.query<Book>(
      `INSERT INTO books (title, author, isbn, cover_url, cover_texture_url, date_started, date_finished, quote, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, title, author,
                 cover_url                              AS "coverUrl",
                 COALESCE(cover_texture_url, cover_url) AS "textureUrl",
                 date_started::text                     AS "dateStarted",
                 date_finished::text                    AS "dateFinished",
                 quote;`,
      [
        title.trim(),
        author.trim(),
        isbn.trim(),
        coverUrl,
        textureUrl,
        dateStarted ?? null,
        dateFinished ?? null,
        quote ?? null,
        req.user!.userId,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
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

  try {
    const result = await pool.query<Book>(
      `UPDATE books
       SET quote = $1
       WHERE id = $2 AND user_id = $3
       RETURNING id, title, author,
                 cover_url                              AS "coverUrl",
                 COALESCE(cover_texture_url, cover_url) AS "textureUrl",
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

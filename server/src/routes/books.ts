import { Router } from "express";
import { pool } from "../db";

/**
 * The shape we return to clients — matches the frontend `Book` interface
 * exactly. It's defined here (rather than imported) because the server is a
 * separate package from the Next.js app; duplicating the type is the accepted
 * cost of that separation. Could be shared via a package later.
 */
export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  dateStarted: string;
  dateFinished: string;
  bookNumber: number;
  quote: string;
}

export const booksRouter = Router();

// GET /api/books — the whole library, ordered by book number.
booksRouter.get("/", async (_req, res) => {
  try {
    // Two deliberate things in this query:
    //  - Quoted aliases ("coverUrl"): Postgres lowercases unquoted identifiers,
    //    so the quotes are what preserve camelCase, making rows match the Book
    //    type with no mapping code.
    //  - date::text: returns clean "YYYY-MM-DD" strings instead of node-pg's
    //    default JS Date objects (which serialize to timestamps and can shift
    //    the day across timezones).
    const result = await pool.query<Book>(
      `SELECT id, title, author,
              cover_url           AS "coverUrl",
              date_started::text  AS "dateStarted",
              date_finished::text AS "dateFinished",
              book_number         AS "bookNumber",
              quote
       FROM books
       ORDER BY book_number;`
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

// POST /api/books — add a book to the library.
//
// Body: { title, author, isbn, dateStarted?, dateFinished?, quote? }. The client
// sends the ISBN it picked from search; the server derives the cover URL from it
// (single home for the Open Library URL scheme) and auto-assigns the next
// book_number, so callers never set either.
booksRouter.post("/", async (req, res) => {
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

  // Derive the cover URL from the ISBN — same scheme the seed/mock data uses.
  const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn.trim()}-L.jpg`;

  try {
    // book_number is assigned in-query as MAX + 1. Good enough for a single-user
    // library; a concurrent insert could in theory collide, which we'll revisit
    // when auth makes numbering per-user.
    const result = await pool.query<Book>(
      `INSERT INTO books (title, author, isbn, cover_url, date_started, date_finished, book_number, quote)
       VALUES ($1, $2, $3, $4, $5, $6,
               (SELECT COALESCE(MAX(book_number), 0) + 1 FROM books),
               $7)
       RETURNING id, title, author,
                 cover_url           AS "coverUrl",
                 date_started::text  AS "dateStarted",
                 date_finished::text AS "dateFinished",
                 book_number         AS "bookNumber",
                 quote;`,
      [
        title.trim(),
        author.trim(),
        isbn.trim(),
        coverUrl,
        dateStarted ?? null,
        dateFinished ?? null,
        quote ?? null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /api/books failed:", err);
    res.status(500).json({ error: "Failed to add book" });
  }
});

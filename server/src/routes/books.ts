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

import { Router } from "express";
import { pool } from "../db";
import { Book } from "./books";

export const usersRouter = Router();

// GET /api/users/:username/books — public library for a given username.
// No auth required: this is the data behind the public profile page.
usersRouter.get("/:username/books", async (req, res) => {
  const { username } = req.params;

  try {
    const result = await pool.query<Book>(
      `SELECT b.id, b.title, b.author,
              b.cover_url           AS "coverUrl",
              b.date_started::text  AS "dateStarted",
              b.date_finished::text AS "dateFinished",
              b.quote
       FROM books b
       JOIN users u ON b.user_id = u.id
       WHERE u.username = $1
       ORDER BY b.date_finished, b.created_at, b.id;`,
      [username]
    );

    // An unknown username returns an empty array, not 404 — keeps it consistent
    // with how the profile page works (real 404 for the profile comes in Chunk 4
    // when we add GET /api/users/:username).
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/users/:username/books failed:", err);
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

// GET /api/users/:username — public profile info (added in Chunk 4).
// POST /api/users/me/avatar + PATCH /api/users/me/avatar — S3 upload (Chunk 7).

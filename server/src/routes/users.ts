import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/requireAuth";
import { Book } from "./books";

export const usersRouter = Router();

interface PublicProfile {
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
}

// GET /api/users/:username — public profile info.
// Returns 404 for unknown usernames (unlike /books which returns an empty array).
usersRouter.get("/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const result = await pool.query<PublicProfile>(
      `SELECT username,
              display_name AS "displayName",
              bio,
              avatar_url   AS "avatarUrl"
       FROM users
       WHERE username = $1;`,
      [username]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /api/users/:username failed:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

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

    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/users/:username/books failed:", err);
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

// PATCH /api/users/me — update the authenticated user's displayName and/or bio.
// Body: { displayName?, bio? } — at least one field required.
usersRouter.patch("/me", requireAuth, async (req, res) => {
  const { displayName, bio } = req.body as {
    displayName?: string | null;
    bio?: string | null;
  };

  // Build the SET clause dynamically — only update fields that were sent.
  const updates: string[] = [];
  const values: unknown[] = [];

  if (displayName !== undefined) {
    updates.push(`display_name = $${values.length + 1}`);
    values.push(displayName ?? null);
  }
  if (bio !== undefined) {
    updates.push(`bio = $${values.length + 1}`);
    values.push(bio ?? null);
  }

  if (updates.length === 0) {
    res.status(400).json({ error: "Provide at least one of: displayName, bio" });
    return;
  }

  values.push(req.user!.userId);
  const userIdParam = `$${values.length}`;

  try {
    const result = await pool.query<PublicProfile>(
      `UPDATE users
       SET ${updates.join(", ")}
       WHERE id = ${userIdParam}
       RETURNING username,
                 display_name AS "displayName",
                 bio,
                 avatar_url   AS "avatarUrl";`,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /api/users/me failed:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// POST /api/users/me/avatar + PATCH /api/users/me/avatar — S3 presigned upload
// flow for profile photos. Implemented in Chunk 7 when S3 is configured.

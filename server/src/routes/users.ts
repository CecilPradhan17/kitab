import { Router } from "express";
import rateLimit from "express-rate-limit";
import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { pool } from "../db";
import { requireAuth } from "../middleware/requireAuth";
import { s3, S3_BUCKET_NAME } from "../lib/s3";
import { Book } from "./books";

export const usersRouter = Router();

const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB

// Keyed by user id, not IP — this route is already auth-gated, so the
// authenticated identity is a more meaningful limit than an IP address
// (which can be shared/proxied across many users).
const avatarUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.user!.userId,
  standardHeaders: true,
  legacyHeaders: false,
});

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

// POST /api/users/me/avatar — issues a short-lived presigned S3 PUT URL so the
// authenticated user can upload a new avatar directly to S3; Express never
// sees the image bytes. Body: { contentType, fileSize }.
//
// contentType/fileSize are declared by the client and checked here before a
// URL is ever issued, but a presigned PUT can't enforce the actual upload
// matches what was declared (that would require a presigned POST with a
// content-length-range policy instead) — the real backstops are the IAM
// user's narrow scope (this bucket only), the URL's short expiry, and this
// route's rate limit, not this check alone.
//
// PATCH /api/users/me/avatar (Chunk 7c) confirms the upload, resizes it via
// sharp, and finalizes avatar_url.
usersRouter.post("/me/avatar", requireAuth, avatarUploadLimiter, async (req, res) => {
  const { contentType, fileSize } = req.body as {
    contentType?: string;
    fileSize?: number;
  };

  if (!contentType || !ALLOWED_AVATAR_TYPES.includes(contentType)) {
    res.status(400).json({
      error: `contentType must be one of: ${ALLOWED_AVATAR_TYPES.join(", ")}`,
    });
    return;
  }

  if (typeof fileSize !== "number" || fileSize <= 0 || fileSize > MAX_AVATAR_BYTES) {
    res.status(400).json({
      error: `fileSize must be between 1 and ${MAX_AVATAR_BYTES} bytes`,
    });
    return;
  }

  // A fresh random key per upload attempt — not a fixed per-user path — so a
  // new avatar naturally gets a new URL once served via CloudFront, with no
  // need for a cache invalidation when the user replaces their photo.
  const key = `avatars/raw/${req.user!.userId}/${randomUUID()}`;

  try {
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 60 }
    );

    res.json({ uploadUrl, key });
  } catch (err) {
    console.error("POST /api/users/me/avatar failed:", err);
    res.status(500).json({ error: "Failed to create upload URL" });
  }
});

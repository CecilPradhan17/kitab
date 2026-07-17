import { Router } from "express";
import rateLimit from "express-rate-limit";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { pool } from "../db";
import { requireAuth } from "../middleware/requireAuth";
import { s3, S3_BUCKET_NAME, CLOUDFRONT_DOMAIN } from "../lib/s3";
import { Book } from "./books";

export const usersRouter = Router();

const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB
const AVATAR_SIZE = 256; // px, square thumbnail actually served to clients
const MAX_BIO_LENGTH = 280; // mirrors the bio_length CHECK constraint (server/db/08_bio_length_constraint.sql)
const MAX_DISPLAY_NAME_LENGTH = 50; // mirrors the display_name_length CHECK constraint (server/db/10_display_name_length_constraint.sql)

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
              b.cover_url                                AS "coverUrl",
              COALESCE(b.cover_texture_url, b.cover_url) AS "textureUrl",
              b.spine_color                               AS "spineColor",
              b.date_started::text                       AS "dateStarted",
              b.date_finished::text                      AS "dateFinished",
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

// PATCH /api/users/me/avatar — confirms a direct-to-S3 upload from
// POST .../avatar. Body: { key } — the raw key returned by that step.
//
// Fetches the raw upload back from S3, resizes it to a single square
// thumbnail via sharp, publishes it under a new serving key, updates
// avatar_url, and cleans up both the raw object and any previous avatar.
usersRouter.patch("/me/avatar", requireAuth, async (req, res) => {
  const { key } = req.body as { key?: string };

  // The key must belong to this user's own raw-upload namespace — otherwise a
  // client could hand us any S3 key (someone else's upload, or an arbitrary
  // string) and have us fetch/process/publish it as their avatar.
  const expectedPrefix = `avatars/raw/${req.user!.userId}/`;
  if (!key || !key.startsWith(expectedPrefix)) {
    res.status(400).json({ error: "Invalid or missing upload key" });
    return;
  }

  let resized: Buffer;
  try {
    const raw = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key }));
    const rawBytes = await raw.Body!.transformToByteArray();
    resized = await sharp(Buffer.from(rawBytes))
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch (err) {
    console.error("PATCH /api/users/me/avatar: failed to fetch/resize upload:", err);
    res.status(400).json({ error: "Could not find or process the uploaded file" });
    return;
  }

  const uploadId = key.slice(expectedPrefix.length);
  const servingKey = `avatars/${req.user!.userId}/${uploadId}.webp`;
  const avatarUrl = `https://${CLOUDFRONT_DOMAIN}/${servingKey}`;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: servingKey,
        Body: resized,
        ContentType: "image/webp",
      })
    );
  } catch (err) {
    console.error("PATCH /api/users/me/avatar: failed to publish thumbnail:", err);
    res.status(500).json({ error: "Failed to save avatar" });
    return;
  }

  // Best-effort cleanup — the new avatar is already live at this point, so a
  // failure here shouldn't fail the request, just leave an orphan to clean up later.
  s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key })).catch((err) => {
    console.error("Failed to clean up raw avatar upload:", err);
  });

  try {
    const current = await pool.query<{ avatarUrl: string | null }>(
      `SELECT avatar_url AS "avatarUrl" FROM users WHERE id = $1;`,
      [req.user!.userId]
    );
    const previousAvatarUrl = current.rows[0]?.avatarUrl;

    const result = await pool.query<PublicProfile>(
      `UPDATE users
       SET avatar_url = $1
       WHERE id = $2
       RETURNING username,
                 display_name AS "displayName",
                 bio,
                 avatar_url   AS "avatarUrl";`,
      [avatarUrl, req.user!.userId]
    );

    // Clean up the previous avatar now that the new one is live and saved —
    // only if it's actually one of ours (defends against ever deleting
    // something that isn't a CloudFront-served object we generated).
    const cdnPrefix = `https://${CLOUDFRONT_DOMAIN}/`;
    if (previousAvatarUrl?.startsWith(cdnPrefix)) {
      const previousKey = previousAvatarUrl.slice(cdnPrefix.length);
      s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET_NAME, Key: previousKey })).catch((err) => {
        console.error("Failed to clean up previous avatar:", err);
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /api/users/me/avatar: failed to update profile:", err);
    res.status(500).json({ error: "Failed to update profile" });
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
    if (typeof displayName === "string" && displayName.length > MAX_DISPLAY_NAME_LENGTH) {
      res.status(400).json({ error: `displayName must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer` });
      return;
    }
    updates.push(`display_name = $${values.length + 1}`);
    values.push(displayName ?? null);
  }
  if (bio !== undefined) {
    if (typeof bio === "string" && bio.length > MAX_BIO_LENGTH) {
      res.status(400).json({ error: `Bio must be ${MAX_BIO_LENGTH} characters or fewer` });
      return;
    }
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
// PATCH /api/users/me/avatar (below) confirms the upload, resizes it via
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

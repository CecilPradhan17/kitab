import { Router } from "express";
import rateLimit from "express-rate-limit";
import { randomUUID } from "crypto";
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { pool } from "../db";
import { requireAuth } from "../middleware/requireAuth";
import { s3, S3_BUCKET_NAME, CLOUDFRONT_DOMAIN } from "../lib/s3";
import { resizeCoverVariants } from "../lib/coverResize";
import { extractRawSpineColor } from "../lib/spineColor";

export const customBooksRouter = Router();

const MAX_TITLE_LENGTH = 200; // mirrors the title_length CHECK constraint (server/db/13_custom_books_length_constraint.sql)
const MAX_AUTHOR_LENGTH = 100; // mirrors the author_length CHECK constraint (server/db/13_custom_books_length_constraint.sql)

// Same limits as avatar upload (server/src/routes/users.ts) — a custom book
// cover is the same shape of problem (user-supplied image, presigned direct
// upload to S3), just for a shared catalog entry instead of a private profile.
const ALLOWED_COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_COVER_BYTES = 5 * 1024 * 1024; // 5MB

// Keyed by user id, same reasoning as the avatar limiter: this route is
// already auth-gated, so the authenticated identity is a more meaningful
// limit than a possibly-shared IP address.
const customCoverUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.user!.userId,
  standardHeaders: true,
  legacyHeaders: false,
});

interface CustomBook {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  textureUrl: string;
  spineColor: string | null;
}

// POST /api/custom-books/cover — issues a short-lived presigned S3 PUT URL so
// the authenticated user can upload a candidate cover image directly to S3;
// Express never sees the image bytes. Body: { contentType, fileSize }.
// Mirrors POST /api/users/me/avatar exactly — see that route for the reasoning
// on why client-declared contentType/fileSize are checked here but aren't the
// real backstop (IAM scope + short URL expiry + rate limit are).
customBooksRouter.post("/cover", requireAuth, customCoverUploadLimiter, async (req, res) => {
  const { contentType, fileSize } = req.body as {
    contentType?: string;
    fileSize?: number;
  };

  if (!contentType || !ALLOWED_COVER_TYPES.includes(contentType)) {
    res.status(400).json({
      error: `contentType must be one of: ${ALLOWED_COVER_TYPES.join(", ")}`,
    });
    return;
  }

  if (typeof fileSize !== "number" || fileSize <= 0 || fileSize > MAX_COVER_BYTES) {
    res.status(400).json({
      error: `fileSize must be between 1 and ${MAX_COVER_BYTES} bytes`,
    });
    return;
  }

  const key = `custom-covers/raw/${req.user!.userId}/${randomUUID()}`;

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
    console.error("POST /api/custom-books/cover failed:", err);
    res.status(500).json({ error: "Failed to create upload URL" });
  }
});

// POST /api/custom-books — confirms a direct-to-S3 cover upload from
// POST .../cover and creates the shared catalog entry. Body: { title, author, key }.
//
// Created once, reused forever after: this is the only place a custom book's
// title/author/cover are ever set. There is deliberately no PATCH/DELETE —
// see 06_custom_books.sql.
customBooksRouter.post("/", requireAuth, async (req, res) => {
  const { title, author, key } = req.body as {
    title?: string;
    author?: string;
    key?: string;
  };

  const errors: string[] = [];
  if (typeof title !== "string" || title.trim() === "") errors.push("title is required");
  if (typeof title === "string" && title.length > MAX_TITLE_LENGTH) {
    errors.push(`title must be ${MAX_TITLE_LENGTH} characters or fewer`);
  }
  if (typeof author !== "string" || author.trim() === "") errors.push("author is required");
  if (typeof author === "string" && author.length > MAX_AUTHOR_LENGTH) {
    errors.push(`author must be ${MAX_AUTHOR_LENGTH} characters or fewer`);
  }

  // The key must belong to this user's own raw-upload namespace — otherwise a
  // client could hand us any S3 key (someone else's upload, or an arbitrary
  // string) and have us publish it as a new shared catalog cover.
  const expectedPrefix = `custom-covers/raw/${req.user!.userId}/`;
  if (!key || !key.startsWith(expectedPrefix)) {
    errors.push("Invalid or missing upload key");
  }

  if (errors.length > 0) {
    res.status(400).json({ error: "Invalid custom book", details: errors });
    return;
  }

  let gridBuffer: Buffer;
  let textureBuffer: Buffer;
  let spineColor: string | null;
  try {
    const raw = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key! }));
    const rawBytes = await raw.Body!.transformToByteArray();
    const rawBuffer = Buffer.from(rawBytes);
    [{ gridBuffer, textureBuffer }, spineColor] = await Promise.all([
      resizeCoverVariants(rawBuffer),
      extractRawSpineColor(rawBuffer),
    ]);
  } catch (err) {
    console.error("POST /api/custom-books: failed to fetch/resize upload:", err);
    res.status(400).json({ error: "Could not find or process the uploaded file" });
    return;
  }

  // A fresh random id (not yet known — assigned by the INSERT below) is what
  // ties this book's images together, so the S3 keys are built from a
  // generated id rather than the raw upload's id.
  const bookId = randomUUID();
  const gridKey = `custom-covers/${bookId}/grid.webp`;
  const textureKey = `custom-covers/${bookId}/texture.webp`;

  try {
    await Promise.all([
      s3.send(new PutObjectCommand({ Bucket: S3_BUCKET_NAME, Key: gridKey, Body: gridBuffer, ContentType: "image/webp" })),
      s3.send(new PutObjectCommand({ Bucket: S3_BUCKET_NAME, Key: textureKey, Body: textureBuffer, ContentType: "image/webp" })),
    ]);
  } catch (err) {
    console.error("POST /api/custom-books: failed to publish cover:", err);
    res.status(500).json({ error: "Failed to save cover" });
    return;
  }

  // Best-effort cleanup of the raw upload — the published cover is already
  // live at this point, so a failure here shouldn't fail the request.
  s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key! })).catch((err) => {
    console.error("Failed to clean up raw custom-book cover upload:", err);
  });

  try {
    const result = await pool.query<CustomBook>(
      `INSERT INTO custom_books (id, title, author, cover_url, texture_url, spine_color, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, author,
                 cover_url   AS "coverUrl",
                 texture_url AS "textureUrl",
                 spine_color AS "spineColor";`,
      [
        bookId,
        title!.trim(),
        author!.trim(),
        `https://${CLOUDFRONT_DOMAIN}/${gridKey}`,
        `https://${CLOUDFRONT_DOMAIN}/${textureKey}`,
        spineColor,
        req.user!.userId,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /api/custom-books failed:", err);
    res.status(500).json({ error: "Failed to create custom book" });
  }
});

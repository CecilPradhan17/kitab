import { PutObjectCommand } from "@aws-sdk/client-s3";
import { pool } from "../db";
import { s3, S3_BUCKET_NAME, CLOUDFRONT_DOMAIN } from "./s3";
import { resizeCoverVariants } from "./coverResize";

// Guards against a corrupt/runaway upstream response before it reaches sharp,
// and against Open Library's placeholder image (it answers a missing cover
// with a 200 and a tiny image rather than a 404). Checked against the actual
// downloaded byte count, not the content-length header — Open Library serves
// over HTTP/2 without ever sending that header, so relying on it meant this
// check misfired as "no cover" on every real cover too.
const MAX_SOURCE_BYTES = 15 * 1024 * 1024; // 15MB
const MIN_SOURCE_BYTES = 1000;

interface CoverUrls {
  coverUrl: string;
  textureUrl: string;
}

/**
 * Returns the S3/CloudFront cover + texture URLs for an ISBN, fetching and
 * ingesting from Open Library the first time that ISBN is seen and reusing
 * the cached `book_covers` row for every book added afterward with the same
 * ISBN — the fetch/resize/upload only ever happens once per ISBN.
 *
 * Never throws: any failure (no cover available, fetch error, resize error)
 * falls back to linking Open Library directly, so POST /api/books never
 * fails because of the cover pipeline.
 */
export async function getOrIngestCover(isbn: string): Promise<CoverUrls> {
  const openLibraryUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

  const cached = await pool.query<CoverUrls>(
    `SELECT cover_url AS "coverUrl", texture_url AS "textureUrl"
     FROM book_covers WHERE isbn = $1;`,
    [isbn]
  );
  if (cached.rows.length > 0) {
    return cached.rows[0];
  }

  try {
    const response = await fetch(openLibraryUrl, {
      headers: { "User-Agent": "Kitab/0.1 (book portfolio project)" },
    });

    if (!response.ok) {
      throw new Error(`No usable cover for ISBN ${isbn} (status ${response.status})`);
    }

    const raw = Buffer.from(await response.arrayBuffer());
    if (raw.length < MIN_SOURCE_BYTES || raw.length > MAX_SOURCE_BYTES) {
      throw new Error(`No usable cover for ISBN ${isbn} (downloaded ${raw.length} bytes)`);
    }

    const { gridBuffer, textureBuffer } = await resizeCoverVariants(raw);

    // Deterministic, ISBN-keyed keys (not a random id like avatars use) — the
    // point of this cache is exactly one object per ISBN, so re-ingesting the
    // same ISBN overwrites in place instead of accumulating orphans.
    const gridKey = `covers/${isbn}/grid.webp`;
    const textureKey = `covers/${isbn}/texture.webp`;

    await Promise.all([
      s3.send(new PutObjectCommand({ Bucket: S3_BUCKET_NAME, Key: gridKey, Body: gridBuffer, ContentType: "image/webp" })),
      s3.send(new PutObjectCommand({ Bucket: S3_BUCKET_NAME, Key: textureKey, Body: textureBuffer, ContentType: "image/webp" })),
    ]);

    const urls: CoverUrls = {
      coverUrl: `https://${CLOUDFRONT_DOMAIN}/${gridKey}`,
      textureUrl: `https://${CLOUDFRONT_DOMAIN}/${textureKey}`,
    };

    // ON CONFLICT DO NOTHING: two concurrent adds of the same new ISBN can both
    // reach this point past the cache-miss check above. Whichever INSERT wins
    // is harmless either way — same deterministic keys, so the loser's S3
    // objects are identical content, not orphaned duplicates.
    const inserted = await pool.query<CoverUrls>(
      `INSERT INTO book_covers (isbn, cover_url, texture_url)
       VALUES ($1, $2, $3)
       ON CONFLICT (isbn) DO NOTHING
       RETURNING cover_url AS "coverUrl", texture_url AS "textureUrl";`,
      [isbn, urls.coverUrl, urls.textureUrl]
    );
    if (inserted.rows.length > 0) {
      return inserted.rows[0];
    }

    // Lost the race — read back the winner's row so callers always get a
    // value that's actually stored in book_covers.
    const winner = await pool.query<CoverUrls>(
      `SELECT cover_url AS "coverUrl", texture_url AS "textureUrl" FROM book_covers WHERE isbn = $1;`,
      [isbn]
    );
    return winner.rows[0];
  } catch (err) {
    console.error(`Cover ingest failed for ISBN ${isbn}, falling back to Open Library:`, err);
    return { coverUrl: openLibraryUrl, textureUrl: openLibraryUrl };
  }
}

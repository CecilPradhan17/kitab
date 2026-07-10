-- Migration 05: shared cover-image cache, keyed by ISBN.
--
-- The init-script mount (./db -> /docker-entrypoint-initdb.d) only runs on a
-- fresh volume. For an existing dev volume, apply this manually:
--   docker exec -i kitab-db psql -U kitab -d kitab < server/db/05_book_covers.sql

-- One row per unique ISBN we've fetched from Open Library and re-hosted on
-- S3/CloudFront. Multiple users adding the same book (same ISBN) share one
-- fetch/resize/upload instead of repeating it per user row in `books`.
CREATE TABLE IF NOT EXISTS book_covers (
  isbn        TEXT PRIMARY KEY,
  -- Small variant for the library grid.
  cover_url   TEXT NOT NULL,
  -- Larger variant for the 3D book render (detail view + story export).
  texture_url TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Nullable: existing `books` rows keep linking Open Library directly (no
-- backfill). Only newly inserted books get an S3/CloudFront texture URL.
ALTER TABLE books
  ADD COLUMN IF NOT EXISTS cover_texture_url TEXT;

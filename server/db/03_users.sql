-- Migration 03: users table + user ownership of books.
--
-- The init-script mount (./db -> /docker-entrypoint-initdb.d) only runs on a
-- fresh volume. For an existing dev volume, apply this manually:
--   docker exec -i kitab-db psql -U kitab -d kitab < server/db/03_users.sql

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- URL-safe handle used in /[username] routing. Lowercase + alphanumeric
  -- characters enforced at the API layer, not here, to keep migrations simple.
  username      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT,
  bio           TEXT,
  -- CloudFront URL set after the S3 presigned-upload flow (Chunk 7).
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Each book belongs to exactly one user. ON DELETE CASCADE: removing a user
-- removes their entire library (personal data, not shared content).
--
-- Nullable so existing seed rows survive this migration without a backfill.
-- The API layer (requireAuth middleware) enforces user_id presence on all writes
-- after Chunk 3 — no book can be inserted without req.user.id.
ALTER TABLE books
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Index for the per-user library query (GET /api/books filters by user_id).
CREATE INDEX IF NOT EXISTS books_user_id_idx ON books (user_id);

-- Migration 06: user-submitted custom books, shared across all users.
--
-- The init-script mount (./db -> /docker-entrypoint-initdb.d) only runs on a
-- fresh volume. For an existing dev volume, apply this manually:
--   docker exec -i kitab-db psql -U kitab -d kitab < server/db/06_custom_books.sql

-- A custom book is created once (title + author + an uploaded cover), then
-- reused by every user who finds and adds it via search afterward — it is
-- never re-uploaded or copied per user. Immutable once created: no update
-- path exists, so every library row referencing one always shows the same
-- title/author/cover as everyone else's.
CREATE TABLE IF NOT EXISTS custom_books (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  author      TEXT NOT NULL,
  cover_url   TEXT NOT NULL,
  texture_url TEXT NOT NULL,
  -- Who submitted it, for provenance. Not used for access control — once
  -- created, a custom book is visible/addable by anyone, same as any Open
  -- Library book.
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A `books` row is sourced from exactly one of isbn (Open Library) or
-- custom_book_id (this table) — never both, never neither. Nullable because
-- existing rows all have an isbn and no custom_book_id.
ALTER TABLE books
  ADD COLUMN IF NOT EXISTS custom_book_id UUID REFERENCES custom_books(id);

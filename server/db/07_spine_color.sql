-- Migration 07: spine color computed at ingest, replacing client-side canvas
-- extraction (see CLAUDE.md "Spine color computed at ingest").
--
-- The init-script mount (./db -> /docker-entrypoint-initdb.d) only runs on a
-- fresh volume. For an existing dev volume, apply this manually:
--   docker exec -i kitab-db psql -U kitab -d kitab < server/db/07_spine_color.sql

-- Raw dominant color (a hex string like "#8a6a3c"), NOT the already re-lit
-- spine color — the re-light/darken styling step stays cheap, pure color
-- math on the frontend (src/lib/coverColor.ts) so it can be tuned without
-- re-ingesting every book. Nullable: extraction can fail (transparent image,
-- unreadable data), in which case the frontend falls back to its own default.
--
-- Stored on all three tables, mirroring cover_url/texture_url: book_covers
-- and custom_books are caches (compute once per ISBN / once per custom book,
-- reuse forever after), and books holds a denormalized copy so the read
-- queries stay single-table with no joins.
ALTER TABLE book_covers  ADD COLUMN IF NOT EXISTS spine_color TEXT;
ALTER TABLE custom_books ADD COLUMN IF NOT EXISTS spine_color TEXT;
ALTER TABLE books        ADD COLUMN IF NOT EXISTS spine_color TEXT;

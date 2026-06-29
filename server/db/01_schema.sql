-- Kitab schema — books table.
--
-- Column names are snake_case (the Postgres convention). The API layer maps
-- them back to the camelCase fields the frontend `Book` type expects
-- (e.g. cover_url -> coverUrl), so the DB stays idiomatic SQL while the JSON
-- the components consume is unchanged.

CREATE TABLE IF NOT EXISTS books (
  -- gen_random_uuid() is built into Postgres core (13+), no extension needed.
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT    NOT NULL,
  author        TEXT    NOT NULL,
  -- ISBN-13 of the selected edition. Nullable (not every Open Library result
  -- has one), but the add-book flow requires it: it's how we build the cover
  -- URL and how future ingest will dedupe/cache covers per unique ISBN.
  isbn          TEXT,
  cover_url     TEXT    NOT NULL,
  date_started  DATE,
  date_finished DATE,
  quote         TEXT,
  -- Insertion time, stamped by the DB. Used only as a tiebreaker when two books
  -- share the same date_finished, so ordering stays deterministic. (id is a
  -- final backstop after this, for the rare case created_at also ties.)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Note: there is deliberately no book_number column. A book's number ("#1, #2,
-- …") is not stored — it's derived on the frontend from the order books are
-- returned in (by date_finished, then created_at, then id). That keeps deletes
-- to a single-row delete with no resequencing, and inserts need no MAX+1 work.

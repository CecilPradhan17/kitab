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
  book_number   INTEGER NOT NULL,
  quote         TEXT
);

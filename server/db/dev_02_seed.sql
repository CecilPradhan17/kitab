-- DEV ONLY — never run against production. See deployment checklist.
--
-- The dev_ prefix is deliberate: docker-entrypoint-initdb.d runs *.sql in
-- alphabetical order, and letters sort after digits, so dev_ files run last —
-- after the schema and all CHECK constraints (whose limits this seed data
-- satisfies). The prefix also makes the two non-production files impossible
-- to miss when applying migrations to a real environment by hand.
--
-- Seed data — the 8 books from src/features/library/mockBooks.ts, with their
-- existing UUIDs preserved. Gives chunk 3's read endpoints real data to return.
--
-- ON CONFLICT (id) DO NOTHING makes this safe to re-run against a populated DB.

INSERT INTO books (id, title, author, isbn, cover_url, date_started, date_finished, quote) VALUES
  ('b1f7c2a0-1d3e-4a5b-8c9d-0e1f2a3b4c5d', 'The Alchemist', 'Paulo Coelho',
   '9780061122415', 'https://covers.openlibrary.org/b/isbn/9780061122415-L.jpg', '2024-01-04', '2024-01-12',
   'And, when you want something, all the universe conspires in helping you to achieve it.'),

  ('c2e8d3b1-2e4f-4b6c-9d0e-1f2a3b4c5d6e', 'Sapiens: A Brief History of Humankind', 'Yuval Noah Harari',
   '9780062316097', 'https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg', '2024-01-18', '2024-02-09',
   'We did not domesticate wheat. It domesticated us.'),

  ('d3f9e4c2-3f5a-4c7d-ae1f-2a3b4c5d6e7f', 'Educated', 'Tara Westover',
   '9780399590504', 'https://covers.openlibrary.org/b/isbn/9780399590504-L.jpg', '2024-02-14', '2024-02-27',
   'You can love someone and still choose to say goodbye to them.'),

  ('e4a0f5d3-4a6b-4d8e-bf2a-3b4c5d6e7f80', 'Atomic Habits', 'James Clear',
   '9780735211292', 'https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg', '2024-03-02', '2024-03-15',
   'You do not rise to the level of your goals. You fall to the level of your systems.'),

  ('f5b1a6e4-5b7c-4e9f-c03b-4c5d6e7f8091', 'The Midnight Library', 'Matt Haig',
   '9780525559474', 'https://covers.openlibrary.org/b/isbn/9780525559474-L.jpg', '2024-03-20', '2024-03-29',
   'Between life and death there is a library, and within that library, the shelves go on forever.'),

  ('a6c2b7f5-6c8d-4f0a-d14c-5d6e7f809102', 'Project Hail Mary', 'Andy Weir',
   '9780593135204', 'https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg', '2024-04-03', '2024-04-19',
   'I penny-pinched my way to the stars.'),

  ('b7d3c8a6-7d9e-4a1b-e25d-6e7f80910213', 'Dune', 'Frank Herbert',
   '9780441013593', 'https://covers.openlibrary.org/b/isbn/9780441013593-L.jpg', '2024-04-25', '2024-05-22',
   'Fear is the mind-killer. Fear is the little-death that brings total obliteration.'),

  ('c8e4d9b7-8e0f-4b2c-f36e-7f8091021324', 'Normal People', 'Sally Rooney',
   '9781984822178', 'https://covers.openlibrary.org/b/isbn/9781984822178-L.jpg', '2024-05-27', '2024-06-04',
   'It was in his power to make her happy. It was something he could just give to her, like money or sex.')
ON CONFLICT (id) DO NOTHING;

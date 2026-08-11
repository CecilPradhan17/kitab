-- DEV ONLY — never run against production. See deployment checklist.
-- (Creates a user with a publicly-known password and blanket-assigns any
-- orphaned books rows to it.)
--
-- Dev-only seed: creates a known local user and assigns the seeded books to them.
-- Run after 03_users.sql and dev_02_seed.sql on an existing dev volume:
--   docker exec -i kitab-db psql -U kitab -d kitab < server/db/dev_04_seed.sql
--
-- Password is 'password' (bcrypt, 10 rounds) — local dev only, never in prod.

INSERT INTO users (id, username, email, password_hash, display_name, bio)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'cecildev',
  'email@gmail.com',
  '$2b$10$6cFSl3RnU5DhjBR4QzHQUe6mqsBywSF4.kow6rOdme/DXYd/IW6.q',
  'Cecil',
  'Building Kitab'
) ON CONFLICT (id) DO NOTHING;

-- Assign any seed books (user_id still null from before auth) to the dev user.
UPDATE books SET user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' WHERE user_id IS NULL;

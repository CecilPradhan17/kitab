ALTER TABLE books ADD CONSTRAINT title_length CHECK (char_length(title) <= 200);

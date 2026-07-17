ALTER TABLE books ADD CONSTRAINT author_length CHECK (char_length(author) <= 100);

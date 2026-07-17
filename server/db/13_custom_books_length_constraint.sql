ALTER TABLE custom_books ADD CONSTRAINT title_length CHECK (char_length(title) <= 200);
ALTER TABLE custom_books ADD CONSTRAINT author_length CHECK (char_length(author) <= 100);

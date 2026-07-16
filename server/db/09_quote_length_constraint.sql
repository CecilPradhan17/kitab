ALTER TABLE books ADD CONSTRAINT quote_length CHECK (char_length(quote) <= 150);

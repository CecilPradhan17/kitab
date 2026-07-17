ALTER TABLE users ADD CONSTRAINT display_name_length CHECK (char_length(display_name) <= 50);

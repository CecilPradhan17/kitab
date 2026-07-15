ALTER TABLE users ADD CONSTRAINT bio_length CHECK (char_length(bio) <= 280);

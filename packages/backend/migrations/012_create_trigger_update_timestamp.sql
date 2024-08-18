CREATE
OR REPLACE FUNCTION update_timestamp () RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_timestamp BEFORE
UPDATE ON "user" FOR EACH ROW
EXECUTE FUNCTION update_timestamp ();

CREATE TRIGGER update_word_list_timestamp BEFORE
UPDATE ON word_list FOR EACH ROW
EXECUTE FUNCTION update_timestamp ();
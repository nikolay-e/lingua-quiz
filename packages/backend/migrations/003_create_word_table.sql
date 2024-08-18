CREATE TABLE IF NOT EXISTS word (
  id SERIAL PRIMARY KEY,
  text VARCHAR(255) NOT NULL,
  language_id VARCHAR(10) NOT NULL REFERENCES language (id),
  usage_example TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (text, language_id)
);

CREATE INDEX idx_word_language ON word (language_id);
CREATE TABLE user_translation_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES "user" (id) ON DELETE CASCADE,
  word_pair_id INTEGER REFERENCES translation (id) ON DELETE CASCADE,
  status translation_status NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, word_pair_id)
);

CREATE INDEX idx_user_translation_progress_user ON user_translation_progress (user_id);

CREATE INDEX idx_user_translation_progress_word_pair ON user_translation_progress (word_pair_id);
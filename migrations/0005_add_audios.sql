CREATE TABLE IF NOT EXISTS audios (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  note_system_error INTEGER,
  audio_key TEXT NOT NULL,
  thumb_key TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

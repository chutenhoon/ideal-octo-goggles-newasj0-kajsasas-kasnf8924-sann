CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_key TEXT NOT NULL,
  thumb_key TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

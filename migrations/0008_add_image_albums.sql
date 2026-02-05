CREATE TABLE IF NOT EXISTS image_albums (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE images ADD COLUMN album_id TEXT;
ALTER TABLE images ADD COLUMN sort_order INTEGER;

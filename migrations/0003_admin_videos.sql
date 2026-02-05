-- Admin video schema (create if missing). Existing tables are updated at runtime.
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  pc_key TEXT NOT NULL DEFAULT '',
  hls_master_key TEXT NOT NULL DEFAULT '',
  thumb_key TEXT,
  r2_key TEXT,
  thumbnail_key TEXT,
  size_bytes INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'READY'
);

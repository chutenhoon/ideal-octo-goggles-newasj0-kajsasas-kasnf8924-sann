-- Combined migrations (run once)
-- Source: 0001_init.sql, 0002_add_thumbnail.sql, 0003_admin_videos.sql, 0004_add_video_keys.sql, 0005_add_audios.sql, 0006_add_notes_images.sql, 0007_add_shorts.sql, 0008_add_image_albums.sql

-- ==== 0001_init.sql ====
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  size_bytes INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos (created_at);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos (status);

CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  ts INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_ts ON login_attempts (ip, ts);

-- ==== 0002_add_thumbnail.sql ====
ALTER TABLE videos ADD COLUMN thumbnail_key TEXT;

-- ==== 0003_admin_videos.sql ====
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

-- ==== 0004_add_video_keys.sql ====
-- D1/SQLite doesn't support IF NOT EXISTS on ADD COLUMN.
-- Run only for missing columns.
ALTER TABLE videos ADD COLUMN description TEXT;
ALTER TABLE videos ADD COLUMN pc_key TEXT;
ALTER TABLE videos ADD COLUMN hls_master_key TEXT;
ALTER TABLE videos ADD COLUMN thumb_key TEXT;

UPDATE videos SET pc_key = r2_key WHERE pc_key IS NULL AND r2_key IS NOT NULL;
UPDATE videos SET thumb_key = thumbnail_key WHERE thumb_key IS NULL AND thumbnail_key IS NOT NULL;

-- ==== 0005_add_audios.sql ====
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

-- ==== 0006_add_notes_images.sql ====
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

-- ==== 0007_add_shorts.sql ====
CREATE TABLE IF NOT EXISTS shorts (
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

-- ==== 0008_add_image_albums.sql ====
CREATE TABLE IF NOT EXISTS image_albums (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE images ADD COLUMN album_id TEXT;
ALTER TABLE images ADD COLUMN sort_order INTEGER;

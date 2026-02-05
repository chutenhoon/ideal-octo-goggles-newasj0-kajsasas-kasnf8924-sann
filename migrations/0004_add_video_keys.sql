-- D1/SQLite doesn't support IF NOT EXISTS on ADD COLUMN.
-- Run only for missing columns.
ALTER TABLE videos ADD COLUMN description TEXT;
ALTER TABLE videos ADD COLUMN pc_key TEXT;
ALTER TABLE videos ADD COLUMN hls_master_key TEXT;
ALTER TABLE videos ADD COLUMN thumb_key TEXT;

UPDATE videos SET pc_key = r2_key WHERE pc_key IS NULL AND r2_key IS NOT NULL;
UPDATE videos SET thumb_key = thumbnail_key WHERE thumb_key IS NULL AND thumbnail_key IS NOT NULL;

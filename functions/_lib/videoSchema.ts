import type { Env } from "./env";

const CREATE_TABLE_SQL = `
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
`;

const ADD_COLUMNS = [
  { name: "description", type: "TEXT" },
  { name: "pc_key", type: "TEXT" },
  { name: "hls_master_key", type: "TEXT" },
  { name: "thumb_key", type: "TEXT" }
];

type ColumnRow = { name: string };

export async function ensureVideosSchema(env: Env) {
  const info = await env.DB.prepare("PRAGMA table_info(videos)").all<ColumnRow>();
  if (!info.results || info.results.length === 0) {
    await env.DB.prepare(CREATE_TABLE_SQL).run();
    return;
  }

  const existing = new Set(info.results.map((row) => row.name));
  for (const column of ADD_COLUMNS) {
    if (!existing.has(column.name)) {
      await env.DB.prepare(
        `ALTER TABLE videos ADD COLUMN ${column.name} ${column.type}`
      ).run();
    }
  }

  if (!existing.has("pc_key")) {
    // Ensure newly added column is populated from existing data when possible.
    await env.DB.prepare(
      "UPDATE videos SET pc_key = r2_key WHERE pc_key IS NULL AND r2_key IS NOT NULL"
    ).run();
  }

  if (!existing.has("thumb_key")) {
    await env.DB.prepare(
      "UPDATE videos SET thumb_key = thumbnail_key WHERE thumb_key IS NULL AND thumbnail_key IS NOT NULL"
    ).run();
  }
}

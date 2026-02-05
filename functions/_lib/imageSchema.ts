import type { Env } from "./env";

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_key TEXT NOT NULL,
  thumb_key TEXT,
  album_id TEXT,
  sort_order INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

const ADD_COLUMNS = [
  { name: "description", type: "TEXT" },
  { name: "image_key", type: "TEXT" },
  { name: "thumb_key", type: "TEXT" },
  { name: "album_id", type: "TEXT" },
  { name: "sort_order", type: "INTEGER" }
];

type ColumnRow = { name: string };

export async function ensureImagesSchema(env: Env) {
  const info = await env.DB.prepare("PRAGMA table_info(images)").all<ColumnRow>();
  if (!info.results || info.results.length === 0) {
    await env.DB.prepare(CREATE_TABLE_SQL).run();
    return;
  }

  const existing = new Set(info.results.map((row) => row.name));
  for (const column of ADD_COLUMNS) {
    if (!existing.has(column.name)) {
      await env.DB.prepare(
        `ALTER TABLE images ADD COLUMN ${column.name} ${column.type}`
      ).run();
    }
  }
}

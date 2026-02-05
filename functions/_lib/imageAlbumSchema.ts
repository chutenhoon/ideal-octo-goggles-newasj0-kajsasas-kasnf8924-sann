import type { Env } from "./env";

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS image_albums (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

type ColumnRow = { name: string };

export async function ensureImageAlbumsSchema(env: Env) {
  const info = await env.DB.prepare("PRAGMA table_info(image_albums)").all<ColumnRow>();
  if (!info.results || info.results.length === 0) {
    await env.DB.prepare(CREATE_TABLE_SQL).run();
  }
}

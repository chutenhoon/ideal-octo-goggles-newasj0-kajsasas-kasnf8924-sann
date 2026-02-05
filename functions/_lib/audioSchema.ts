import type { Env } from "./env";

const CREATE_TABLE_SQL = `
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
`;

const ADD_COLUMNS = [
  { name: "description", type: "TEXT" },
  { name: "note_system_error", type: "INTEGER" },
  { name: "audio_key", type: "TEXT" },
  { name: "thumb_key", type: "TEXT" }
];

type ColumnRow = { name: string };

export async function ensureAudiosSchema(env: Env) {
  const info = await env.DB.prepare("PRAGMA table_info(audios)").all<ColumnRow>();
  if (!info.results || info.results.length === 0) {
    await env.DB.prepare(CREATE_TABLE_SQL).run();
    return;
  }

  const existing = new Set(info.results.map((row) => row.name));
  for (const column of ADD_COLUMNS) {
    if (!existing.has(column.name)) {
      await env.DB.prepare(
        `ALTER TABLE audios ADD COLUMN ${column.name} ${column.type}`
      ).run();
    }
  }
}

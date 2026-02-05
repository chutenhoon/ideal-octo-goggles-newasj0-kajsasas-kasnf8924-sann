import type { Env } from "./env";

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

const ADD_COLUMNS = [{ name: "content", type: "TEXT" }];

type ColumnRow = { name: string };

export async function ensureNotesSchema(env: Env) {
  const info = await env.DB.prepare("PRAGMA table_info(notes)").all<ColumnRow>();
  if (!info.results || info.results.length === 0) {
    await env.DB.prepare(CREATE_TABLE_SQL).run();
    return;
  }

  const existing = new Set(info.results.map((row) => row.name));
  for (const column of ADD_COLUMNS) {
    if (!existing.has(column.name)) {
      await env.DB.prepare(
        `ALTER TABLE notes ADD COLUMN ${column.name} ${column.type}`
      ).run();
    }
  }
}

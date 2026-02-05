import type { Env } from "./env";

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/^-|-$/g, "");
}

export async function uniqueSlug(
  env: Env,
  base: string,
  fallbackId: string,
  tables: string | string[] = "videos"
) {
  const baseSlug = slugify(base) || `memory-${fallbackId.slice(0, 6)}`;
  const list = Array.isArray(tables) ? tables : [tables];
  const allowed = new Set(["videos", "shorts"]);
  for (const table of list) {
    if (!allowed.has(table)) {
      throw new Error("Invalid slug table.");
    }
    const existing = await env.DB.prepare(
      `SELECT slug FROM ${table} WHERE slug = ?`
    )
      .bind(baseSlug)
      .first();
    if (existing) {
      return `${baseSlug}-${fallbackId.slice(0, 6)}`;
    }
  }
  return baseSlug;
}

import type { Env } from "../../_lib/env";
import { json } from "../../_lib/response";

export const onRequest: PagesFunction<Env> = async ({ env }) => {
  const result = await env.DB.prepare(
    "SELECT id, slug, title, created_at, status, COALESCE(thumb_key, thumbnail_key) as thumbnail_key FROM videos WHERE status = ? ORDER BY created_at DESC"
  )
    .bind("ready")
    .all();

  return json(result.results || []);
};

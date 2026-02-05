import type { Env } from "../../_lib/env";
import { json } from "../../_lib/response";
import { ensureShortsSchema } from "../../_lib/shortSchema";

export const onRequest: PagesFunction<Env> = async ({ env }) => {
  await ensureShortsSchema(env);

  const result = await env.DB.prepare(
    "SELECT id, slug, title, created_at, status, COALESCE(thumb_key, thumbnail_key) as thumbnail_key FROM shorts WHERE status = ? ORDER BY created_at DESC"
  )
    .bind("ready")
    .all();

  return json(result.results || []);
};

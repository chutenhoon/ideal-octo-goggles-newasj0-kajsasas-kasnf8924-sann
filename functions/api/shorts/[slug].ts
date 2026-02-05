import type { Env } from "../../_lib/env";
import { errorJson, json } from "../../_lib/response";
import { ensureShortsSchema } from "../../_lib/shortSchema";

export const onRequest: PagesFunction<Env> = async ({ env, params }) => {
  await ensureShortsSchema(env);

  const slug = params.slug as string;
  if (!slug) return errorJson(400, "Missing slug.");

  const row = await env.DB.prepare(
    "SELECT id, slug, title, created_at, size_bytes, status, COALESCE(thumb_key, thumbnail_key) as thumbnail_key FROM shorts WHERE slug = ?"
  )
    .bind(slug)
    .first();

  if (!row) {
    return errorJson(404, "Not found.");
  }

  return json(row);
};

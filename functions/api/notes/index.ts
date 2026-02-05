import type { Env } from "../../_lib/env";
import { json } from "../../_lib/response";
import { ensureNotesSchema } from "../../_lib/noteSchema";

export const onRequest: PagesFunction<Env> = async ({ env }) => {
  await ensureNotesSchema(env);

  const { results } = await env.DB.prepare(
    "SELECT id, title, content, created_at FROM notes ORDER BY created_at DESC"
  ).all();

  return json(results || []);
};

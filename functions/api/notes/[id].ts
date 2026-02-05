import type { Env } from "../../_lib/env";
import { errorJson, json } from "../../_lib/response";
import { ensureNotesSchema } from "../../_lib/noteSchema";

export const onRequest: PagesFunction<Env> = async ({ env, params }) => {
  await ensureNotesSchema(env);

  const id = params.id as string;
  if (!id) return errorJson(400, "Missing id.");

  const row = await env.DB.prepare(
    "SELECT id, title, content, created_at FROM notes WHERE id = ?"
  )
    .bind(id)
    .first();

  if (!row) return errorJson(404, "Not found.");

  return json(row);
};

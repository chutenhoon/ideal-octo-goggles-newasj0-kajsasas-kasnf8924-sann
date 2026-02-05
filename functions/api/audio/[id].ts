import type { Env } from "../../_lib/env";
import { errorJson, json } from "../../_lib/response";
import { ensureAudiosSchema } from "../../_lib/audioSchema";

export const onRequest: PagesFunction<Env> = async ({ env, params }) => {
  const id = params.id as string;
  if (!id) return errorJson(400, "Missing id.");

  await ensureAudiosSchema(env);

  const row = await env.DB.prepare(
    "SELECT id, title, description, note_system_error, audio_key, thumb_key, created_at FROM audios WHERE id = ?"
  )
    .bind(id)
    .first();

  if (!row) {
    return errorJson(404, "Not found.");
  }

  return json(row);
};

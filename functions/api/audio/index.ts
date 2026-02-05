import type { Env } from "../../_lib/env";
import { json } from "../../_lib/response";
import { ensureAudiosSchema } from "../../_lib/audioSchema";

export const onRequest: PagesFunction<Env> = async ({ env }) => {
  await ensureAudiosSchema(env);

  const { results } = await env.DB.prepare(
    "SELECT id, title, description, note_system_error, audio_key, thumb_key, created_at FROM audios ORDER BY created_at DESC"
  ).all();

  return json(results || []);
};

import type { Env } from "../../../_lib/env";
import { errorJson, json } from "../../../_lib/response";
import { requireAdmin } from "../../../_lib/adminAuth";
import { ensureAudiosSchema } from "../../../_lib/audioSchema";

function isValidAudioKey(id: string, key: string) {
  if (!key.startsWith(`audios/${id}/audio.`)) return false;
  const rest = key.slice(`audios/${id}/`.length);
  return !rest.includes("/") && rest.startsWith("audio.");
}

function isValidThumbKey(id: string, key: string) {
  if (!key.startsWith(`audios/${id}/thumb.`)) return false;
  const rest = key.slice(`audios/${id}/`.length);
  return !rest.includes("/") && rest.startsWith("thumb.");
}

function normalizeNote(value: unknown) {
  if (typeof value === "number") return value ? 1 : 0;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    return value === "1" || value.toLowerCase() === "true" ? 1 : 0;
  }
  return 0;
}

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  const guard = requireAdmin(request, env);
  if (guard) return guard;

  await ensureAudiosSchema(env);

  const id = params.id as string;
  if (!id) return errorJson(400, "Missing id.");

  if (request.method === "GET") {
    const row = await env.DB.prepare(
      "SELECT id, title, description, note_system_error, audio_key, thumb_key, created_at, updated_at FROM audios WHERE id = ?"
    )
      .bind(id)
      .first();
    if (!row) return errorJson(404, "Not found.");
    return json(row);
  }

  if (request.method === "DELETE") {
    const row = await env.DB.prepare(
      "SELECT audio_key, thumb_key FROM audios WHERE id = ?"
    )
      .bind(id)
      .first<{ audio_key: string | null; thumb_key: string | null }>();

    if (!row) return errorJson(404, "Not found.");

    const deletions: Promise<unknown>[] = [];
    if (row.audio_key) deletions.push(env.R2_VIDEOS.delete(row.audio_key));
    if (row.thumb_key) deletions.push(env.R2_VIDEOS.delete(row.thumb_key));
    if (deletions.length > 0) {
      await Promise.all(deletions);
    }

    await env.DB.prepare("DELETE FROM audios WHERE id = ?")
      .bind(id)
      .run();

    return json({ ok: true });
  }

  if (request.method !== "PUT") {
    return new Response(null, { status: 405 });
  }

  let payload: {
    title?: string;
    note_system_error?: unknown;
    audio_key?: string;
    thumb_key?: string | null;
  } = {};

  try {
    payload = await request.json();
  } catch {
    return errorJson(400, "Invalid request.");
  }

  const updates: string[] = [];
  const paramsList: Array<string | number | null> = [];

  if (Object.prototype.hasOwnProperty.call(payload, "title")) {
    const title = payload.title?.toString().trim() || "";
    updates.push("title = ?");
    paramsList.push(title);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "note_system_error")) {
    const note = normalizeNote(payload.note_system_error);
    const description = note ? "Do lỗi hệ thống không ghi lại được hình ảnh" : null;
    updates.push("note_system_error = ?", "description = ?");
    paramsList.push(note, description);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "audio_key")) {
    const audioKey = payload.audio_key?.toString().trim() || "";
    if (!audioKey || !isValidAudioKey(id, audioKey)) {
      return errorJson(400, "Invalid audio_key.");
    }
    updates.push("audio_key = ?");
    paramsList.push(audioKey);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "thumb_key")) {
    if (payload.thumb_key === null) {
      updates.push("thumb_key = ?");
      paramsList.push(null);
    } else {
      const thumbKey = payload.thumb_key?.toString().trim() || "";
      if (!thumbKey || !isValidThumbKey(id, thumbKey)) {
        return errorJson(400, "Invalid thumb_key.");
      }
      updates.push("thumb_key = ?");
      paramsList.push(thumbKey);
    }
  }

  updates.push("updated_at = ?");
  paramsList.push(new Date().toISOString());

  if (updates.length > 0) {
    await env.DB.prepare(
      `UPDATE audios SET ${updates.join(", ")} WHERE id = ?`
    )
      .bind(...paramsList, id)
      .run();
  }

  const updated = await env.DB.prepare(
    "SELECT id, title, description, note_system_error, audio_key, thumb_key, created_at, updated_at FROM audios WHERE id = ?"
  )
    .bind(id)
    .first();

  return json({ ok: true, audio: updated });
};


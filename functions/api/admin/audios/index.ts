import type { Env } from "../../../_lib/env";
import { errorJson, json } from "../../../_lib/response";
import { requireAdmin } from "../../../_lib/adminAuth";
import { ensureAudiosSchema } from "../../../_lib/audioSchema";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string) {
  return UUID_RE.test(value);
}

function extractAudioId(key: string) {
  const match = /^audios\/([^/]+)\/audio\./.exec(key);
  return match ? match[1] : null;
}

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

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const guard = requireAdmin(request, env);
  if (guard) return guard;

  await ensureAudiosSchema(env);

  if (request.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT id, title, description, note_system_error, audio_key, thumb_key, created_at, updated_at FROM audios ORDER BY created_at DESC"
    ).all();
    return json(results || []);
  }

  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  let payload: {
    id?: string;
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

  const title = payload.title?.toString().trim() || "";
  const audioKey = payload.audio_key?.toString().trim() || "";
  const providedId = payload.id?.toString().trim() || "";

  if (!title || !audioKey) {
    return errorJson(400, "Missing required fields.");
  }

  if (providedId && !isValidUuid(providedId)) {
    return errorJson(400, "Invalid audio id.");
  }

  const inferredId = extractAudioId(audioKey);
  const id = providedId || inferredId || "";
  if (!id || !isValidUuid(id)) {
    return errorJson(400, "Invalid audio id.");
  }
  if (inferredId && inferredId !== id) {
    return errorJson(400, "Audio id does not match audio_key.");
  }

  if (!isValidAudioKey(id, audioKey)) {
    return errorJson(400, "Invalid audio_key.");
  }

  let thumbKey: string | null = null;
  if (Object.prototype.hasOwnProperty.call(payload, "thumb_key")) {
    if (payload.thumb_key === null) {
      thumbKey = null;
    } else if (typeof payload.thumb_key === "string" && payload.thumb_key.trim()) {
      thumbKey = payload.thumb_key.trim();
    } else {
      return errorJson(400, "Invalid thumb_key.");
    }
    if (thumbKey && !isValidThumbKey(id, thumbKey)) {
      return errorJson(400, "Invalid thumb_key.");
    }
  }

  const note = normalizeNote(payload.note_system_error);
  const description = note ? "Do lỗi hệ thống không ghi lại được hình ảnh" : null;
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO audios
      (id, title, description, note_system_error, audio_key, thumb_key, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      title,
      description,
      note,
      audioKey,
      thumbKey,
      now,
      now
    )
    .run();

  const created = await env.DB.prepare(
    "SELECT id, title, description, note_system_error, audio_key, thumb_key, created_at, updated_at FROM audios WHERE id = ?"
  )
    .bind(id)
    .first();

  return json({ ok: true, audio: created });
};


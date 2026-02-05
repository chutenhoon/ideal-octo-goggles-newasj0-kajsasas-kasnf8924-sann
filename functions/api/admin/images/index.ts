import type { Env } from "../../../_lib/env";
import { errorJson, json } from "../../../_lib/response";
import { requireAdmin } from "../../../_lib/adminAuth";
import { ensureImagesSchema } from "../../../_lib/imageSchema";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string) {
  return UUID_RE.test(value);
}

function extractImageId(key: string) {
  const match = /^images\/([^/]+)\//.exec(key);
  return match ? match[1] : null;
}

function isValidImageKey(id: string, key: string) {
  if (!key.startsWith(`images/${id}/image.`)) return false;
  const rest = key.slice(`images/${id}/`.length);
  return !rest.includes("/") && rest.startsWith("image.");
}

function isValidThumbKey(id: string, key: string) {
  if (!key.startsWith(`images/${id}/thumb.`)) return false;
  const rest = key.slice(`images/${id}/`.length);
  return !rest.includes("/") && rest.startsWith("thumb.");
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const guard = requireAdmin(request, env);
  if (guard) return guard;

  await ensureImagesSchema(env);

  if (request.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT id, title, description, image_key, thumb_key, created_at, updated_at FROM images WHERE album_id IS NULL ORDER BY created_at DESC"
    ).all();
    return json(results || []);
  }

  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  let payload: {
    id?: string;
    title?: string;
    description?: string | null;
    image_key?: string;
    thumb_key?: string | null;
  } = {};

  try {
    payload = await request.json();
  } catch {
    return errorJson(400, "Invalid request.");
  }

  const title = payload.title?.toString().trim() || "";
  const imageKey = payload.image_key?.toString().trim() || "";
  const providedId = payload.id?.toString().trim() || "";

  if (!title || !imageKey) {
    return errorJson(400, "Missing required fields.");
  }

  if (providedId && !isValidUuid(providedId)) {
    return errorJson(400, "Invalid image id.");
  }

  const inferredId = extractImageId(imageKey);
  const id = providedId || inferredId || "";
  if (!id || !isValidUuid(id)) {
    return errorJson(400, "Invalid image id.");
  }
  if (inferredId && inferredId !== id) {
    return errorJson(400, "Image id does not match image_key.");
  }

  if (!isValidImageKey(id, imageKey)) {
    return errorJson(400, "Invalid image_key.");
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

  const description =
    typeof payload.description === "string"
      ? payload.description.trim()
      : "";

  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO images
      (id, title, description, image_key, thumb_key, album_id, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      title,
      description || null,
      imageKey,
      thumbKey,
      null,
      null,
      now,
      now
    )
    .run();

  const created = await env.DB.prepare(
    "SELECT id, title, description, image_key, thumb_key, created_at, updated_at FROM images WHERE id = ?"
  )
    .bind(id)
    .first();

  return json({ ok: true, image: created });
};

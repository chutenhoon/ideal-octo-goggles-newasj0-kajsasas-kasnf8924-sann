import type { Env } from "../../../_lib/env";
import { errorJson, json } from "../../../_lib/response";
import { requireAdmin } from "../../../_lib/adminAuth";
import { ensureImagesSchema } from "../../../_lib/imageSchema";
import { ensureImageAlbumsSchema } from "../../../_lib/imageAlbumSchema";

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
  await ensureImageAlbumsSchema(env);

  if (request.method === "GET") {
    const { results } = await env.DB.prepare(
      `SELECT
        a.id,
        a.title,
        a.description,
        a.created_at,
        a.updated_at,
        (SELECT COUNT(1) FROM images WHERE album_id = a.id) as count,
        i.image_key as cover_key,
        i.thumb_key as cover_thumb_key
      FROM image_albums a
      LEFT JOIN images i ON i.album_id = a.id AND i.sort_order = 0
      ORDER BY a.created_at DESC`
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
    items?: Array<{
      id?: string;
      image_key?: string;
      thumb_key?: string | null;
      sort_order?: number;
    }>;
  } = {};

  try {
    payload = await request.json();
  } catch {
    return errorJson(400, "Invalid request.");
  }

  const title = payload.title?.toString().trim() || "";
  const description =
    typeof payload.description === "string"
      ? payload.description.trim()
      : "";
  const albumId = payload.id?.toString().trim() || "";
  const items = payload.items || [];

  if (!title || !albumId) {
    return errorJson(400, "Missing required fields.");
  }
  if (!isValidUuid(albumId)) {
    return errorJson(400, "Invalid album id.");
  }
  if (!Array.isArray(items) || items.length === 0) {
    return errorJson(400, "Album items are required.");
  }

  const normalizedItems: Array<{
    id: string;
    image_key: string;
    thumb_key: string | null;
    sort_order: number;
  }> = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index] || {};
    const itemId = item.id?.toString().trim() || "";
    const imageKey = item.image_key?.toString().trim() || "";
    const thumbKey =
      typeof item.thumb_key === "string" && item.thumb_key.trim()
        ? item.thumb_key.trim()
        : null;
    const sortOrder =
      typeof item.sort_order === "number" && Number.isFinite(item.sort_order)
        ? Math.max(0, Math.floor(item.sort_order))
        : index;

    if (!itemId || !isValidUuid(itemId)) {
      return errorJson(400, "Invalid image id.");
    }
    if (!imageKey) {
      return errorJson(400, "Missing image_key.");
    }
    const inferred = extractImageId(imageKey);
    if (inferred && inferred !== itemId) {
      return errorJson(400, "Image id does not match image_key.");
    }
    if (!isValidImageKey(itemId, imageKey)) {
      return errorJson(400, "Invalid image_key.");
    }
    if (thumbKey && !isValidThumbKey(itemId, thumbKey)) {
      return errorJson(400, "Invalid thumb_key.");
    }

    normalizedItems.push({
      id: itemId,
      image_key: imageKey,
      thumb_key: thumbKey,
      sort_order: sortOrder
    });
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO image_albums (id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(albumId, title, description || null, now, now)
    .run();

  for (const item of normalizedItems) {
    await env.DB.prepare(
      `INSERT INTO images
        (id, title, description, image_key, thumb_key, album_id, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        item.id,
        `${title} #${item.sort_order + 1}`,
        null,
        item.image_key,
        item.thumb_key,
        albumId,
        item.sort_order,
        now,
        now
      )
      .run();
  }

  const album = await env.DB.prepare(
    "SELECT id, title, description, created_at, updated_at FROM image_albums WHERE id = ?"
  )
    .bind(albumId)
    .first();

  return json({ ok: true, album });
};

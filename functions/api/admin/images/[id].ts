import type { Env } from "../../../_lib/env";
import { errorJson, json } from "../../../_lib/response";
import { requireAdmin } from "../../../_lib/adminAuth";
import { ensureImagesSchema } from "../../../_lib/imageSchema";

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

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  const guard = requireAdmin(request, env);
  if (guard) return guard;

  await ensureImagesSchema(env);

  const id = params.id as string;
  if (!id) return errorJson(400, "Missing id.");

  if (request.method === "GET") {
    const row = await env.DB.prepare(
      "SELECT id, title, description, image_key, thumb_key, created_at, updated_at, album_id FROM images WHERE id = ?"
    )
      .bind(id)
      .first();
    if (!row) return errorJson(404, "Not found.");
    if (row.album_id) {
      return errorJson(400, "Album images are managed via albums.");
    }
    return json(row);
  }

  if (request.method === "DELETE") {
    const row = await env.DB.prepare(
      "SELECT image_key, thumb_key, album_id FROM images WHERE id = ?"
    )
      .bind(id)
      .first<{ image_key: string | null; thumb_key: string | null; album_id: string | null }>();

    if (!row) return errorJson(404, "Not found.");
    if (row.album_id) {
      return errorJson(400, "Album images are managed via albums.");
    }

    const deletions: Promise<unknown>[] = [];
    if (row.image_key) deletions.push(env.R2_VIDEOS.delete(row.image_key));
    if (row.thumb_key) deletions.push(env.R2_VIDEOS.delete(row.thumb_key));
    if (deletions.length > 0) {
      await Promise.all(deletions);
    }

    await env.DB.prepare("DELETE FROM images WHERE id = ?")
      .bind(id)
      .run();

    return json({ ok: true });
  }

  if (request.method !== "PUT") {
    return new Response(null, { status: 405 });
  }

  const albumCheck = await env.DB.prepare(
    "SELECT album_id FROM images WHERE id = ?"
  )
    .bind(id)
    .first<{ album_id: string | null }>();
  if (!albumCheck) return errorJson(404, "Not found.");
  if (albumCheck.album_id) {
    return errorJson(400, "Album images are managed via albums.");
  }

  let payload: {
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

  const updates: string[] = [];
  const paramsList: Array<string | null> = [];

  if (Object.prototype.hasOwnProperty.call(payload, "title")) {
    const title = payload.title?.toString().trim() || "";
    updates.push("title = ?");
    paramsList.push(title);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "description")) {
    const description =
      typeof payload.description === "string"
        ? payload.description.trim()
        : "";
    updates.push("description = ?");
    paramsList.push(description || null);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "image_key")) {
    const imageKey = payload.image_key?.toString().trim() || "";
    if (!imageKey || !isValidImageKey(id, imageKey)) {
      return errorJson(400, "Invalid image_key.");
    }
    updates.push("image_key = ?");
    paramsList.push(imageKey);
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
      `UPDATE images SET ${updates.join(", ")} WHERE id = ?`
    )
      .bind(...paramsList, id)
      .run();
  }

  const updated = await env.DB.prepare(
    "SELECT id, title, description, image_key, thumb_key, created_at, updated_at FROM images WHERE id = ?"
  )
    .bind(id)
    .first();

  return json({ ok: true, image: updated });
};

import type { Env } from "../../../_lib/env";
import { errorJson, json } from "../../../_lib/response";
import { requireAdmin } from "../../../_lib/adminAuth";
import { ensureImagesSchema } from "../../../_lib/imageSchema";
import { ensureImageAlbumsSchema } from "../../../_lib/imageAlbumSchema";

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  const guard = requireAdmin(request, env);
  if (guard) return guard;

  await ensureImagesSchema(env);
  await ensureImageAlbumsSchema(env);

  const id = params.id as string;
  if (!id) return errorJson(400, "Missing id.");

  if (request.method === "GET") {
    const album = await env.DB.prepare(
      "SELECT id, title, description, created_at, updated_at FROM image_albums WHERE id = ?"
    )
      .bind(id)
      .first();
    if (!album) return errorJson(404, "Not found.");

    const { results } = await env.DB.prepare(
      "SELECT id, image_key, thumb_key, sort_order FROM images WHERE album_id = ? ORDER BY sort_order ASC, created_at ASC"
    )
      .bind(id)
      .all();

    return json({ ...album, images: results || [] });
  }

  if (request.method === "DELETE") {
    const album = await env.DB.prepare(
      "SELECT id FROM image_albums WHERE id = ?"
    )
      .bind(id)
      .first();
    if (!album) return errorJson(404, "Not found.");

    const { results } = await env.DB.prepare(
      "SELECT image_key, thumb_key FROM images WHERE album_id = ?"
    )
      .bind(id)
      .all<{ image_key: string | null; thumb_key: string | null }>();

    const deletions: Promise<unknown>[] = [];
    for (const row of results || []) {
      if (row.image_key) deletions.push(env.R2_VIDEOS.delete(row.image_key));
      if (row.thumb_key) deletions.push(env.R2_VIDEOS.delete(row.thumb_key));
    }
    if (deletions.length > 0) {
      await Promise.all(deletions);
    }

    await env.DB.prepare("DELETE FROM images WHERE album_id = ?")
      .bind(id)
      .run();
    await env.DB.prepare("DELETE FROM image_albums WHERE id = ?")
      .bind(id)
      .run();

    return json({ ok: true });
  }

  if (request.method !== "PUT") {
    return new Response(null, { status: 405 });
  }

  let payload: { title?: string; description?: string | null } = {};
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

  updates.push("updated_at = ?");
  paramsList.push(new Date().toISOString());

  if (updates.length > 0) {
    await env.DB.prepare(
      `UPDATE image_albums SET ${updates.join(", ")} WHERE id = ?`
    )
      .bind(...paramsList, id)
      .run();
  }

  const updated = await env.DB.prepare(
    "SELECT id, title, description, created_at, updated_at FROM image_albums WHERE id = ?"
  )
    .bind(id)
    .first();

  return json({ ok: true, album: updated });
};

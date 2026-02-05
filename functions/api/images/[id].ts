import type { Env } from "../../_lib/env";
import { errorJson, json } from "../../_lib/response";
import { ensureImagesSchema } from "../../_lib/imageSchema";
import { ensureImageAlbumsSchema } from "../../_lib/imageAlbumSchema";

export const onRequest: PagesFunction<Env> = async ({ env, params }) => {
  await ensureImagesSchema(env);
  await ensureImageAlbumsSchema(env);

  const id = params.id as string;
  if (!id) return errorJson(400, "Missing id.");

  const album = await env.DB.prepare(
    "SELECT id, title, description, created_at FROM image_albums WHERE id = ?"
  )
    .bind(id)
    .first();

  if (album) {
    const { results } = await env.DB.prepare(
      "SELECT id, image_key, thumb_key, sort_order FROM images WHERE album_id = ? ORDER BY sort_order ASC, created_at ASC"
    )
      .bind(id)
      .all();

    return json({
      type: "album",
      ...album,
      images: results || [],
      count: results?.length || 0
    });
  }

  const row = await env.DB.prepare(
    "SELECT id, title, description, image_key, thumb_key, created_at, album_id FROM images WHERE id = ?"
  )
    .bind(id)
    .first();

  if (!row) return errorJson(404, "Not found.");

  if (row.album_id) {
    const albumRow = await env.DB.prepare(
      "SELECT id, title, description, created_at FROM image_albums WHERE id = ?"
    )
      .bind(row.album_id)
      .first();
    if (albumRow) {
      const { results } = await env.DB.prepare(
        "SELECT id, image_key, thumb_key, sort_order FROM images WHERE album_id = ? ORDER BY sort_order ASC, created_at ASC"
      )
        .bind(row.album_id)
        .all();

      return json({
        type: "album",
        ...albumRow,
        images: results || [],
        count: results?.length || 0,
        active_image_id: row.id
      });
    }
  }

  return json({ ...row, type: "single" });
};

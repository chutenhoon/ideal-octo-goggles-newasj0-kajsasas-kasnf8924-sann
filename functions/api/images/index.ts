import type { Env } from "../../_lib/env";
import { json } from "../../_lib/response";
import { ensureImagesSchema } from "../../_lib/imageSchema";
import { ensureImageAlbumsSchema } from "../../_lib/imageAlbumSchema";

export const onRequest: PagesFunction<Env> = async ({ env }) => {
  await ensureImagesSchema(env);
  await ensureImageAlbumsSchema(env);

  const { results } = await env.DB.prepare(
    `SELECT * FROM (
      SELECT
        id,
        title,
        description,
        created_at,
        image_key,
        thumb_key,
        1 as count,
        'single' as type
      FROM images
      WHERE album_id IS NULL
      UNION ALL
      SELECT
        a.id,
        a.title,
        a.description,
        a.created_at,
        i.image_key,
        i.thumb_key,
        (SELECT COUNT(1) FROM images WHERE album_id = a.id) as count,
        'album' as type
      FROM image_albums a
      LEFT JOIN images i ON i.album_id = a.id AND i.sort_order = 0
    )
    ORDER BY created_at DESC`
  ).all();

  return json(results || []);
};

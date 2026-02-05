import type { Env } from "../../../_lib/env";
import { errorJson, json } from "../../../_lib/response";
import { requireAdmin } from "../../../_lib/adminAuth";

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const guard = requireAdmin(request, env);
  if (guard) return guard;

  let payload: { slug?: string; id?: string } = {};
  try {
    payload = await request.json();
  } catch {
    return errorJson(400, "Invalid request.");
  }

  const { slug, id } = payload;
  if (!slug && !id) {
    return errorJson(400, "Missing video identifier.");
  }

  const row = await env.DB.prepare(
    "SELECT id, r2_key, thumbnail_key, pc_key, thumb_key, hls_master_key FROM videos WHERE slug = ? OR id = ?"
  )
    .bind(slug || null, id || null)
    .first<{
      id: string;
      r2_key: string | null;
      thumbnail_key: string | null;
      pc_key: string | null;
      thumb_key: string | null;
      hls_master_key: string | null;
    }>();

  if (!row) {
    return errorJson(404, "Not found.");
  }

  const deletions: Promise<unknown>[] = [];
  const pcKey = row.pc_key || row.r2_key;
  const thumbKey = row.thumb_key || row.thumbnail_key;
  if (pcKey) {
    deletions.push(env.R2_VIDEOS.delete(pcKey));
  }
  if (thumbKey) {
    deletions.push(env.R2_VIDEOS.delete(thumbKey));
  }
  if (row.hls_master_key) {
    const prefix = row.hls_master_key.slice(
      0,
      row.hls_master_key.lastIndexOf("/") + 1
    );
    try {
      const list = await env.R2_VIDEOS.list({ prefix });
      if (list.objects.length > 0) {
        deletions.push(env.R2_VIDEOS.delete(list.objects.map((obj) => obj.key)));
      }
    } catch {
      // Best-effort.
    }
  }

  await Promise.all(deletions);

  await env.DB.prepare("DELETE FROM videos WHERE id = ?")
    .bind(row.id)
    .run();

  return json({ ok: true });
};

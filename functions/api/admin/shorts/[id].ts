import type { Env } from "../../../_lib/env";
import { errorJson, json } from "../../../_lib/response";
import { requireAdmin } from "../../../_lib/adminAuth";
import { ensureShortsSchema } from "../../../_lib/shortSchema";

function isValidPcKey(id: string, key: string) {
  return key === `shorts/${id}/pc.mp4`;
}

function isValidHlsKey(id: string, key: string) {
  return key === `shorts/${id}/hls/index.m3u8`;
}

function isValidThumbKey(id: string, key: string) {
  const prefix = `shorts/${id}/thumb.`;
  if (!key.startsWith(prefix)) return false;
  const rest = key.slice(prefix.length);
  return rest.length > 0 && !rest.includes("/");
}

function prefixFromKey(key?: string | null) {
  if (!key) return null;
  const idx = key.lastIndexOf("/");
  if (idx === -1) return null;
  return key.slice(0, idx + 1);
}

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  const guard = requireAdmin(request, env);
  if (guard) return guard;

  await ensureShortsSchema(env);

  const id = params.id as string;
  if (!id) return errorJson(400, "Missing id.");

  if (request.method === "GET") {
    const row = await env.DB.prepare(
      "SELECT id, slug, title, description, pc_key, hls_master_key, COALESCE(thumb_key, thumbnail_key) as thumb_key, created_at, updated_at, status FROM shorts WHERE id = ?"
    )
      .bind(id)
      .first();
    if (!row) return errorJson(404, "Not found.");
    return json(row);
  }

  if (request.method === "DELETE") {
    const row = await env.DB.prepare(
      "SELECT id, r2_key, thumbnail_key, pc_key, thumb_key, hls_master_key FROM shorts WHERE id = ?"
    )
      .bind(id)
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

    await env.DB.prepare("DELETE FROM shorts WHERE id = ?")
      .bind(row.id)
      .run();

    return json({ ok: true });
  }

  if (request.method !== "PUT") {
    return new Response(null, { status: 405 });
  }

  const existing = await env.DB.prepare(
    "SELECT id, slug, title, description, pc_key, hls_master_key, thumb_key, thumbnail_key, r2_key FROM shorts WHERE id = ?"
  )
    .bind(id)
    .first<{
      id: string;
      slug: string;
      title: string;
      description: string | null;
      pc_key: string | null;
      hls_master_key: string | null;
      thumb_key: string | null;
      thumbnail_key: string | null;
      r2_key: string | null;
    }>();

  if (!existing) return errorJson(404, "Not found.");

  let payload: {
    title?: string;
    description?: string;
    pc_key?: string;
    thumb_key?: string | null;
    hls_master_key?: string;
    size_bytes?: number;
  } = {};

  try {
    payload = await request.json();
  } catch {
    return errorJson(400, "Invalid request.");
  }

  const hasTitle = Object.prototype.hasOwnProperty.call(payload, "title");
  const hasDescription = Object.prototype.hasOwnProperty.call(
    payload,
    "description"
  );
  const hasPcKey = Object.prototype.hasOwnProperty.call(payload, "pc_key");
  const hasThumbKey = Object.prototype.hasOwnProperty.call(payload, "thumb_key");
  const hasHlsKey = Object.prototype.hasOwnProperty.call(
    payload,
    "hls_master_key"
  );

  const updates: string[] = [];
  const paramsList: Array<string | number | null> = [];
  const now = new Date().toISOString();

  const currentThumbKey = existing.thumb_key || existing.thumbnail_key || null;
  const currentHlsKey = existing.hls_master_key || null;

  if (hasTitle) {
    const title = payload.title?.toString().trim() || "";
    updates.push("title = ?");
    paramsList.push(title || existing.title);
  }

  if (hasDescription) {
    const description = payload.description?.toString().trim() || "";
    updates.push("description = ?");
    paramsList.push(description || null);
  }

  if (hasPcKey) {
    const pcKey = payload.pc_key?.toString().trim() || "";
    if (!pcKey || !isValidPcKey(id, pcKey)) {
      return errorJson(400, "Invalid pc_key.");
    }
    updates.push("pc_key = ?", "r2_key = ?", "size_bytes = ?");
    const sizeBytes =
      typeof payload.size_bytes === "number" && Number.isFinite(payload.size_bytes)
        ? Math.max(0, Math.floor(payload.size_bytes))
        : null;
    paramsList.push(pcKey, pcKey, sizeBytes);
  }

  if (hasThumbKey) {
    if (payload.thumb_key === null) {
      if (currentThumbKey) {
        try {
          await env.R2_VIDEOS.delete(currentThumbKey);
        } catch {
          // Best-effort cleanup.
        }
      }
      updates.push("thumb_key = ?", "thumbnail_key = ?");
      paramsList.push(null, null);
    } else {
      const nextThumbKey = payload.thumb_key?.toString().trim() || "";
      if (!nextThumbKey || !isValidThumbKey(id, nextThumbKey)) {
        return errorJson(400, "Invalid thumb_key.");
      }
      if (currentThumbKey && currentThumbKey !== nextThumbKey) {
        try {
          await env.R2_VIDEOS.delete(currentThumbKey);
        } catch {
          // Best-effort cleanup.
        }
      }
      updates.push("thumb_key = ?", "thumbnail_key = ?");
      paramsList.push(nextThumbKey, nextThumbKey);
    }
  }

  if (hasHlsKey) {
    const nextHlsKey = payload.hls_master_key?.toString().trim() || "";
    if (!nextHlsKey || !isValidHlsKey(id, nextHlsKey)) {
      return errorJson(400, "Invalid hls_master_key.");
    }
    updates.push("hls_master_key = ?");
    paramsList.push(nextHlsKey);

    const previousPrefix = prefixFromKey(currentHlsKey);
    const nextPrefix = prefixFromKey(nextHlsKey);
    if (previousPrefix && nextPrefix && previousPrefix !== nextPrefix) {
      try {
        const list = await env.R2_VIDEOS.list({ prefix: previousPrefix });
        if (list.objects.length > 0) {
          await env.R2_VIDEOS.delete(list.objects.map((obj) => obj.key));
        }
      } catch {
        // Best-effort cleanup.
      }
    }
  }

  updates.push("updated_at = ?");
  paramsList.push(now);

  if (updates.length > 0) {
    await env.DB.prepare(
      `UPDATE shorts SET ${updates.join(", ")} WHERE id = ?`
    )
      .bind(...paramsList, id)
      .run();
  }

  const updated = await env.DB.prepare(
    "SELECT id, slug, title, description, pc_key, hls_master_key, COALESCE(thumb_key, thumbnail_key) as thumb_key, created_at, updated_at, status FROM shorts WHERE id = ?"
  )
    .bind(id)
    .first();

  return json({ ok: true, short: updated });
};

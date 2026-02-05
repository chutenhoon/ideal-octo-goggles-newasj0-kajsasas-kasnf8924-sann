import type { Env } from "../../../_lib/env";
import { errorJson, json } from "../../../_lib/response";
import { requireAdmin } from "../../../_lib/adminAuth";
import { ensureVideosSchema } from "../../../_lib/videoSchema";
import { uniqueSlug } from "../../../_lib/slug";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string) {
  return UUID_RE.test(value);
}

function extractVideoId(key: string) {
  const match = /^videos\/([^/]+)\//.exec(key);
  return match ? match[1] : null;
}

function isValidPcKey(id: string, key: string) {
  return key === `videos/${id}/pc.mp4`;
}

function isValidHlsKey(id: string, key: string) {
  return key === `videos/${id}/hls/index.m3u8`;
}

function isValidThumbKey(id: string, key: string) {
  const prefix = `videos/${id}/thumb.`;
  if (!key.startsWith(prefix)) return false;
  const rest = key.slice(prefix.length);
  return rest.length > 0 && !rest.includes("/");
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const guard = requireAdmin(request, env);
  if (guard) return guard;

  await ensureVideosSchema(env);

  if (request.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT id, slug, title, COALESCE(thumb_key, thumbnail_key) as thumb_key, created_at, updated_at, status FROM videos ORDER BY created_at DESC"
    ).all();
    return json(results || []);
  }

  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  let payload: {
    id?: string;
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

  const title = payload.title?.toString().trim() || "";
  const pcKey = payload.pc_key?.toString().trim() || "";
  const hlsMasterKey = payload.hls_master_key?.toString().trim() || "";
  if (!title || !pcKey || !hlsMasterKey) {
    return errorJson(400, "Missing required fields.");
  }

  const providedId = payload.id?.toString().trim() || "";
  if (providedId && !isValidUuid(providedId)) {
    return errorJson(400, "Invalid video id.");
  }

  const inferredId = extractVideoId(pcKey) || extractVideoId(hlsMasterKey);
  const id = providedId || inferredId || "";
  if (!id) {
    return errorJson(400, "Missing video id.");
  }
  if (!isValidUuid(id)) {
    return errorJson(400, "Invalid video id.");
  }
  if (inferredId && inferredId !== id) {
    return errorJson(400, "Video id does not match upload keys.");
  }

  if (!isValidPcKey(id, pcKey)) {
    return errorJson(400, "Invalid pc_key.");
  }
  if (!isValidHlsKey(id, hlsMasterKey)) {
    return errorJson(400, "Invalid hls_master_key.");
  }

  const hasThumbKey = Object.prototype.hasOwnProperty.call(
    payload,
    "thumb_key"
  );
  let thumbKey: string | null = null;
  if (hasThumbKey) {
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
  const sizeBytes =
    typeof payload.size_bytes === "number" && Number.isFinite(payload.size_bytes)
      ? Math.max(0, Math.floor(payload.size_bytes))
      : null;

  const slug = await uniqueSlug(env, title, id);
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO videos
      (id, slug, title, description, pc_key, hls_master_key, thumb_key, r2_key, thumbnail_key, size_bytes, created_at, updated_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      slug,
      title,
      description || null,
      pcKey,
      hlsMasterKey,
      thumbKey,
      pcKey,
      thumbKey,
      sizeBytes,
      now,
      now,
      "ready"
    )
    .run();

  const video = await env.DB.prepare(
    "SELECT id, slug, title, description, pc_key, hls_master_key, thumb_key, created_at, updated_at, status FROM videos WHERE id = ?"
  )
    .bind(id)
    .first();

  return json({ ok: true, video });
};

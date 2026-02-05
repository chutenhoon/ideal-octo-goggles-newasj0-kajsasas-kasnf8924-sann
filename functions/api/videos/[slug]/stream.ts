import type { Env } from "../../../_lib/env";
import { errorJson } from "../../../_lib/response";

export const onRequest: PagesFunction<Env> = async ({ env, request, params }) => {
  const slug = params.slug as string;
  if (!slug) return errorJson(400, "Missing slug.");

  const row = await env.DB.prepare(
    "SELECT r2_key, size_bytes FROM videos WHERE slug = ? AND status = ?"
  )
    .bind(slug, "ready")
    .first<{ r2_key: string; size_bytes: number }>();

  if (!row?.r2_key) return errorJson(404, "Not found.");

  const rangeHeader = request.headers.get("Range");
  let size = row.size_bytes || 0;
  if (!size) {
    const head = await env.R2_VIDEOS.head(row.r2_key);
    size = head?.size || 0;
  }

  let object: R2ObjectBody | null = null;
  let status = 200;
  const headers = new Headers();

  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, max-age=86400");
  headers.set("Vary", "Range");

  if (rangeHeader && size > 0) {
    const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
    if (!match) {
      return new Response(null, { status: 416 });
    }

    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : size - 1;
    const safeEnd = Math.min(end, size - 1);
    if (Number.isNaN(start) || Number.isNaN(safeEnd) || start > safeEnd) {
      return new Response(null, { status: 416 });
    }

    const length = safeEnd - start + 1;
    object = await env.R2_VIDEOS.get(row.r2_key, {
      range: { offset: start, length }
    });

    status = 206;
    headers.set("Content-Range", `bytes ${start}-${safeEnd}/${size}`);
    headers.set("Content-Length", length.toString());
  } else {
    object = await env.R2_VIDEOS.get(row.r2_key);
    if (object) {
      headers.set("Content-Length", object.size.toString());
    }
  }

  if (!object) {
    return errorJson(404, "Not found.");
  }

  headers.set(
    "Content-Type",
    object.httpMetadata?.contentType || "video/mp4"
  );

  return new Response(object.body, {
    status,
    headers
  });
};

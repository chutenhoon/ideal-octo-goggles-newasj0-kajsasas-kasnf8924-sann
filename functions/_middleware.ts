import type { Env } from "./_lib/env";
import { getCookie, SESSION_COOKIE, verifySession } from "./_lib/auth";
import { errorJson } from "./_lib/response";

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login"]);
const PUBLIC_PREFIXES = ["/assets/", "/favicon", "/robots", "/manifest"];
const HLS_PATH_RE = /^\/api\/videos\/([^/]+)\/hls\/(.+)$/;
const SHORTS_HLS_PATH_RE = /^\/api\/shorts\/([^/]+)\/hls\/(.+)$/;
const MEDIA_PATH_RE = /^\/media\/(.+)$/;

const MEDIA_CONTENT_TYPES: Record<string, string> = {
  m3u8: "application/vnd.apple.mpegurl",
  ts: "video/mp2t",
  m4s: "video/iso.segment",
  mp4: "video/mp4",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  webm: "audio/webm",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};

function contentTypeForKey(key: string) {
  const ext = key.split(".").pop()?.toLowerCase() || "";
  return MEDIA_CONTENT_TYPES[ext] || "application/octet-stream";
}

function normalizePath(value: string) {
  let path = value.replace(/\\/g, "/");
  while (path.startsWith("./")) {
    path = path.slice(2);
  }
  path = path.replace(/^\/+/, "");
  return path;
}

function isSafePath(path: string) {
  if (!path) return false;
  if (path.includes("\0")) return false;
  if (path.includes("..")) return false;
  if (path.startsWith("/")) return false;
  if (path.includes("\\")) return false;
  return true;
}

function prefixFromKey(key: string) {
  const idx = key.lastIndexOf("/");
  if (idx === -1) return null;
  return key.slice(0, idx + 1);
}

export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (request.method === "OPTIONS") {
    return next();
  }

  const hlsMatch = HLS_PATH_RE.exec(pathname);
  const shortsHlsMatch = SHORTS_HLS_PATH_RE.exec(pathname);
  const mediaMatch = MEDIA_PATH_RE.exec(pathname);

  if (PUBLIC_PATHS.has(pathname)) {
    return next();
  }

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return next();
  }

  const token = getCookie(request, SESSION_COOKIE);
  if (token) {
    const session = await verifySession(env.SESSION_SECRET, token);
    if (session) {
      if (hlsMatch) {
        const slug = hlsMatch[1];
        let relPath = hlsMatch[2] || "";
        try {
          relPath = decodeURIComponent(relPath);
        } catch {
          // Keep raw path if decoding fails.
        }
        relPath = normalizePath(relPath);
        if (!isSafePath(relPath)) {
          return errorJson(400, "Invalid path.");
        }

        const row = await env.DB.prepare(
          "SELECT hls_master_key FROM videos WHERE slug = ? AND status = ?"
        )
          .bind(slug, "ready")
          .first<{ hls_master_key: string | null }>();

        if (!row?.hls_master_key) {
          return errorJson(404, "Not found.");
        }

        const prefix = prefixFromKey(row.hls_master_key);
        if (!prefix) {
          return errorJson(404, "Not found.");
        }

        const objectKey = `${prefix}${relPath}`;
        const object = await env.R2_VIDEOS.get(objectKey);
        if (!object) return errorJson(404, "Not found.");

        const headers = new Headers();
        headers.set(
          "Content-Type",
          object.httpMetadata?.contentType || contentTypeForKey(objectKey)
        );
        headers.set("Cache-Control", "public, max-age=3600");
        if (object.size) {
          headers.set("Content-Length", object.size.toString());
        }

        return new Response(object.body, {
          status: 200,
          headers
        });
      }

      if (shortsHlsMatch) {
        const slug = shortsHlsMatch[1];
        let relPath = shortsHlsMatch[2] || "";
        try {
          relPath = decodeURIComponent(relPath);
        } catch {
          // Keep raw path if decoding fails.
        }
        relPath = normalizePath(relPath);
        if (!isSafePath(relPath)) {
          return errorJson(400, "Invalid path.");
        }

        const row = await env.DB.prepare(
          "SELECT hls_master_key FROM shorts WHERE slug = ? AND status = ?"
        )
          .bind(slug, "ready")
          .first<{ hls_master_key: string | null }>();

        if (!row?.hls_master_key) {
          return errorJson(404, "Not found.");
        }

        const prefix = prefixFromKey(row.hls_master_key);
        if (!prefix) {
          return errorJson(404, "Not found.");
        }

        const objectKey = `${prefix}${relPath}`;
        const object = await env.R2_VIDEOS.get(objectKey);
        if (!object) return errorJson(404, "Not found.");

        const headers = new Headers();
        headers.set(
          "Content-Type",
          object.httpMetadata?.contentType || contentTypeForKey(objectKey)
        );
        headers.set("Cache-Control", "public, max-age=3600");
        if (object.size) {
          headers.set("Content-Length", object.size.toString());
        }

        return new Response(object.body, {
          status: 200,
          headers
        });
      }

      if (mediaMatch) {
        let relPath = mediaMatch[1] || "";
        try {
          relPath = decodeURIComponent(relPath);
        } catch {
          // Keep raw path if decoding fails.
        }
        relPath = normalizePath(relPath);
        if (!isSafePath(relPath)) {
          return errorJson(400, "Invalid path.");
        }

        const object = await env.R2_VIDEOS.get(relPath);
        if (!object) return errorJson(404, "Not found.");

        const headers = new Headers();
        headers.set(
          "Content-Type",
          object.httpMetadata?.contentType || contentTypeForKey(relPath)
        );
        headers.set("Cache-Control", "public, max-age=3600");
        if (object.size) {
          headers.set("Content-Length", object.size.toString());
        }

        return new Response(object.body, {
          status: 200,
          headers
        });
      }

      return next();
    }
  }

  if (pathname.startsWith("/api/")) {
    return errorJson(401, "Unauthorized");
  }

  url.pathname = "/login";
  return Response.redirect(url.toString(), 302);
};

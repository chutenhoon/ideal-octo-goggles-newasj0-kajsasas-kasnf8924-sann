import type { Env } from "../../../_lib/env";
import { errorJson, json } from "../../../_lib/response";
import { requireAdmin } from "../../../_lib/adminAuth";
import { presignObjectUpload } from "../../../_lib/r2Multipart";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string) {
  return UUID_RE.test(value);
}

function isSafePath(path: string) {
  if (!path) return false;
  if (path.includes("\0")) return false;
  if (path.includes("..")) return false;
  if (path.startsWith("/")) return false;
  if (path.includes("\\")) return false;
  return true;
}

function isAllowedPath(path: string) {
  if (path === "pc.mp4") return true;
  if (path.startsWith("thumb.") && !path.includes("/")) return true;
  if (path.startsWith("hls/") && path.length > "hls/".length) return true;
  return false;
}

function isAllowedAudioPath(path: string) {
  if (path.startsWith("audio.") && !path.includes("/")) return true;
  if (path.startsWith("thumb.") && !path.includes("/")) return true;
  return false;
}

function isAllowedImagePath(path: string) {
  if (path.startsWith("image.") && !path.includes("/")) return true;
  if (path.startsWith("thumb.") && !path.includes("/")) return true;
  return false;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const guard = requireAdmin(request, env);
  if (guard) return guard;

  const missing = [
    "R2_S3_ACCESS_KEY_ID",
    "R2_S3_SECRET_ACCESS_KEY",
    "R2_S3_ENDPOINT",
    "R2_S3_BUCKET"
  ].filter((key) => !env[key as keyof Env]);

  if (missing.length > 0) {
    return errorJson(500, `Missing R2 config: ${missing.join(", ")}`);
  }

  let payload: {
    videoId?: string;
    shortId?: string;
    audioId?: string;
    imageId?: string;
    path?: string;
    contentType?: string;
  } = {};

  try {
    payload = await request.json();
  } catch {
    return errorJson(400, "Invalid request.");
  }

  const videoId = payload.videoId?.trim() || "";
  const shortId = payload.shortId?.trim() || "";
  const audioId = payload.audioId?.trim() || "";
  const imageId = payload.imageId?.trim() || "";
  const path = payload.path?.trim() || "";
  const contentType = payload.contentType?.trim() || "";

  if (!path || !contentType) {
    return errorJson(400, "Missing upload fields.");
  }

  const hasVideo = Boolean(videoId);
  const hasShort = Boolean(shortId);
  const hasAudio = Boolean(audioId);
  const hasImage = Boolean(imageId);
  const targetCount = [hasVideo, hasShort, hasAudio, hasImage].filter(Boolean)
    .length;
  if (targetCount !== 1) {
    return errorJson(400, "Missing upload target.");
  }

  if (hasVideo) {
    if (!isValidUuid(videoId)) {
      return errorJson(400, "Invalid video id.");
    }
    if (!isSafePath(path) || !isAllowedPath(path)) {
      return errorJson(400, "Invalid upload path.");
    }
  } else if (hasShort) {
    if (!isValidUuid(shortId)) {
      return errorJson(400, "Invalid short id.");
    }
    if (!isSafePath(path) || !isAllowedPath(path)) {
      return errorJson(400, "Invalid upload path.");
    }
  } else if (hasAudio) {
    if (!isValidUuid(audioId)) {
      return errorJson(400, "Invalid audio id.");
    }
    if (!isSafePath(path) || !isAllowedAudioPath(path)) {
      return errorJson(400, "Invalid upload path.");
    }
    if (path.startsWith("audio.") && !contentType.startsWith("audio/")) {
      return errorJson(400, "Invalid audio content type.");
    }
    if (path.startsWith("thumb.") && !contentType.startsWith("image/")) {
      return errorJson(400, "Invalid thumbnail content type.");
    }
  } else {
    if (!isValidUuid(imageId)) {
      return errorJson(400, "Invalid image id.");
    }
    if (!isSafePath(path) || !isAllowedImagePath(path)) {
      return errorJson(400, "Invalid upload path.");
    }
    if (path.startsWith("image.") && !contentType.startsWith("image/")) {
      return errorJson(400, "Invalid image content type.");
    }
    if (path.startsWith("thumb.") && !contentType.startsWith("image/")) {
      return errorJson(400, "Invalid thumbnail content type.");
    }
  }

  const objectKey = hasVideo
    ? `videos/${videoId}/${path}`
    : hasShort
      ? `shorts/${shortId}/${path}`
      : hasAudio
        ? `audios/${audioId}/${path}`
        : `images/${imageId}/${path}`;

  try {
    const uploadUrl = await presignObjectUpload(env, objectKey, contentType);
    return json({ uploadUrl, objectKey });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to presign upload.";
    console.error("presign failed", message);
    return errorJson(500, message);
  }
};

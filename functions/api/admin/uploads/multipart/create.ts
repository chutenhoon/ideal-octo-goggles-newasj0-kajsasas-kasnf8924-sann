import type { Env } from "../../../../_lib/env";
import { errorJson, json } from "../../../../_lib/response";
import { requireAdmin } from "../../../../_lib/adminAuth";
import {
  createMultipartUpload,
  presignPartUpload
} from "../../../../_lib/r2Multipart";

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

function isAllowedAudioPath(path: string) {
  if (path.startsWith("audio.") && !path.includes("/")) return true;
  return false;
}

function choosePartSize(sizeBytes: number) {
  const min = 5 * 1024 * 1024;
  const base = 10 * 1024 * 1024;
  const maxParts = 10000;
  let partSize = Math.max(min, base);
  if (Math.ceil(sizeBytes / partSize) > maxParts) {
    partSize = Math.ceil(sizeBytes / maxParts);
  }
  const chunk = 5 * 1024 * 1024;
  return Math.ceil(partSize / chunk) * chunk;
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
    sizeBytes?: number;
    contentType?: string;
    path?: string;
  } = {};

  try {
    payload = await request.json();
  } catch {
    return errorJson(400, "Invalid request.");
  }

  const videoId = payload.videoId?.trim() || "";
  const shortId = payload.shortId?.trim() || "";
  const audioId = payload.audioId?.trim() || "";
  const sizeBytes =
    typeof payload.sizeBytes === "number" && Number.isFinite(payload.sizeBytes)
      ? Math.max(0, Math.floor(payload.sizeBytes))
      : 0;
  const contentType = payload.contentType?.trim() || "video/mp4";
  const path = payload.path?.trim() || "";

  if (!sizeBytes) {
    return errorJson(400, "Missing size.");
  }

  if (!contentType.startsWith("video/")) {
    if (!contentType.startsWith("audio/")) {
      return errorJson(400, "Invalid content type.");
    }
  }

  const hasVideo = Boolean(videoId);
  const hasShort = Boolean(shortId);
  const hasAudio = Boolean(audioId);
  if ((hasVideo ? 1 : 0) + (hasShort ? 1 : 0) + (hasAudio ? 1 : 0) !== 1) {
    return errorJson(400, "Missing upload target.");
  }

  if (hasVideo || hasShort) {
    if (!contentType.startsWith("video/")) {
      return errorJson(400, "Invalid content type.");
    }
    if (path && path !== "pc.mp4") {
      return errorJson(400, "Invalid upload path.");
    }
    if (hasVideo && !isValidUuid(videoId)) {
      return errorJson(400, "Invalid video id.");
    }
    if (hasShort && !isValidUuid(shortId)) {
      return errorJson(400, "Invalid short id.");
    }
  } else {
    if (!contentType.startsWith("audio/")) {
      return errorJson(400, "Invalid content type.");
    }
    if (!isValidUuid(audioId)) {
      return errorJson(400, "Invalid audio id.");
    }
    if (!isSafePath(path) || !isAllowedAudioPath(path)) {
      return errorJson(400, "Invalid upload path.");
    }
  }

  const r2Key = hasVideo
    ? `videos/${videoId}/pc.mp4`
    : hasShort
      ? `shorts/${shortId}/pc.mp4`
      : `audios/${audioId}/${path}`;

  const partSize = choosePartSize(sizeBytes);
  const totalParts = Math.ceil(sizeBytes / partSize);

  let uploadId: string;
  let parts: Array<{ partNumber: number; url: string }>;

  try {
    uploadId = await createMultipartUpload(env, r2Key, contentType);
    parts = await Promise.all(
      Array.from({ length: totalParts }, async (_, index) => {
        const partNumber = index + 1;
        const url = await presignPartUpload(env, r2Key, uploadId, partNumber);
        return { partNumber, url };
      })
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Multipart init failed.";
    console.error("multipart create failed", message);
    return errorJson(500, message);
  }

  return json({
    uploadId,
    r2Key,
    partSize,
    totalParts,
    parts
  });
};

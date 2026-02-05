import type { Env } from "../../../_lib/env";
import { errorJson, json } from "../../../_lib/response";
import {
  completeMultipartUpload,
  listMultipartParts
} from "../../../_lib/r2Multipart";
import { requireAdmin } from "../../../_lib/adminAuth";

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const guard = requireAdmin(request, env);
  if (guard) return guard;

  let payload: {
    videoId?: string;
    uploadId?: string;
    r2Key?: string;
    sizeBytes?: number;
    parts?: Array<{ partNumber: number; etag?: string }>;
    totalParts?: number;
    thumbnailKey?: string | null;
  } = {};

  try {
    payload = await request.json();
  } catch {
    return errorJson(400, "Invalid request.");
  }

  const { videoId, uploadId, r2Key, sizeBytes, parts, totalParts, thumbnailKey } =
    payload;
  if (!videoId || !uploadId || !r2Key || !sizeBytes) {
    return errorJson(400, "Missing completion fields.");
  }

  try {
    let finalParts: Array<{ partNumber: number; etag: string }> = [];
    const providedParts =
      parts?.filter((part) => part.etag).map((part) => ({
        partNumber: part.partNumber,
        etag: part.etag as string
      })) || [];

    if (
      providedParts.length > 0 &&
      (!totalParts || providedParts.length === totalParts)
    ) {
      finalParts = providedParts;
    } else {
      finalParts = await listMultipartParts(env, r2Key, uploadId);
    }

    if (finalParts.length === 0) {
      return errorJson(400, "No uploaded parts found.");
    }

    const expectedTotal = totalParts || parts?.length;
    if (expectedTotal && finalParts.length !== expectedTotal) {
      return errorJson(400, "Upload incomplete. Missing parts.");
    }

    await completeMultipartUpload(env, r2Key, uploadId, finalParts);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "R2 upload finalize failed.";
    console.error("upload complete failed", message);
    return errorJson(500, message);
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE videos SET status = ?, size_bytes = ?, thumbnail_key = COALESCE(?, thumbnail_key), updated_at = ? WHERE id = ?"
  )
    .bind("ready", sizeBytes, thumbnailKey || null, now, videoId)
    .run();

  return json({ ok: true });
};

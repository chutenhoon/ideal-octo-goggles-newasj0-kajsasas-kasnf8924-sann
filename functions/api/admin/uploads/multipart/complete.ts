import type { Env } from "../../../../_lib/env";
import { errorJson, json } from "../../../../_lib/response";
import { requireAdmin } from "../../../../_lib/adminAuth";
import {
  completeMultipartUpload,
  listMultipartParts
} from "../../../../_lib/r2Multipart";

const KEY_RE =
  /^(videos|shorts)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/pc\.mp4$/i;

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
    uploadId?: string;
    r2Key?: string;
    parts?: Array<{ partNumber: number; etag?: string }>;
    totalParts?: number;
  } = {};

  try {
    payload = await request.json();
  } catch {
    return errorJson(400, "Invalid request.");
  }

  const uploadId = payload.uploadId?.trim() || "";
  const r2Key = payload.r2Key?.trim() || "";
  const totalParts =
    typeof payload.totalParts === "number" && Number.isFinite(payload.totalParts)
      ? Math.max(0, Math.floor(payload.totalParts))
      : 0;

  if (!uploadId || !r2Key) {
    return errorJson(400, "Missing completion fields.");
  }

  if (!KEY_RE.test(r2Key)) {
    return errorJson(400, "Invalid upload key.");
  }

  try {
    let finalParts: Array<{ partNumber: number; etag: string }> = [];
    const providedParts =
      payload.parts?.filter((part) => part.etag).map((part) => ({
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

    const expectedTotal = totalParts || payload.parts?.length;
    if (expectedTotal && finalParts.length !== expectedTotal) {
      return errorJson(400, "Upload incomplete. Missing parts.");
    }

    await completeMultipartUpload(env, r2Key, uploadId, finalParts);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Multipart finalize failed.";
    console.error("multipart complete failed", message);
    return errorJson(500, message);
  }

  return json({ ok: true });
};

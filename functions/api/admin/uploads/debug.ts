import type { Env } from "../../../_lib/env";
import { errorJson, json } from "../../../_lib/response";
import { requireAdmin } from "../../../_lib/adminAuth";

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "GET") {
    return new Response(null, { status: 405 });
  }

  const guard = requireAdmin(request, env);
  if (guard) return guard;

  const accessKeyId = env.R2_S3_ACCESS_KEY_ID || "";
  const secret = env.R2_S3_SECRET_ACCESS_KEY || "";
  const endpoint = env.R2_S3_ENDPOINT || "";
  const bucket = env.R2_S3_BUCKET || "";

  return json({
    endpoint,
    bucket,
    accessKeyIdLen: accessKeyId.length,
    accessKeyIdSuffix: accessKeyId.slice(-4),
    secretLen: secret.length,
    secretSuffix: secret.slice(-4)
  });
};

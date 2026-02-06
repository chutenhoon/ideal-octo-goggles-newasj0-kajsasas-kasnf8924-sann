import type { Env } from "../../_lib/env";
import { errorJson } from "../../_lib/response";
import { adminSessionCookie, createAdminSession } from "../../_lib/adminAuth";
import { isRateLimited, recordFailedAttempt } from "../../_lib/rateLimit";

function getClientIp(request: Request) {
  const cfIp = request.headers.get("CF-Connecting-IP");
  if (cfIp) return cfIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const rateLimitKey = `admin:${getClientIp(request)}`;
  if (await isRateLimited(env, rateLimitKey)) {
    return errorJson(429, "Too many attempts. Try again soon.");
  }

  let payload: { key?: string } = {};
  try {
    payload = await request.json();
  } catch {
    return errorJson(400, "Invalid request.");
  }

  if (!payload.key || payload.key !== env.ADMIN_PANEL_KEY) {
    await recordFailedAttempt(env, rateLimitKey);
    return errorJson(401, "Invalid key.");
  }

  const token = await createAdminSession(env);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": adminSessionCookie(token)
    }
  });
};

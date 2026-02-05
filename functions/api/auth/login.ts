import type { Env } from "../../_lib/env";
import { createSession, sessionCookie } from "../../_lib/auth";
import { errorJson } from "../../_lib/response";
import { isRateLimited, recordFailedAttempt } from "../../_lib/rateLimit";

function getClientIp(request: Request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("x-forwarded-for") ||
    "unknown"
  );
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const ip = getClientIp(request);
  if (await isRateLimited(env, ip)) {
    return errorJson(429, "Too many attempts. Try again soon.");
  }

  let payload: { key?: string } = {};
  try {
    payload = await request.json();
  } catch {
    return errorJson(400, "Invalid request.");
  }

  if (!payload.key || payload.key !== env.VMS_KEY) {
    await recordFailedAttempt(env, ip);
    return errorJson(401, "Invalid key.");
  }

  const token = await createSession(env.SESSION_SECRET);
  const headers = new Headers();
  headers.set("Set-Cookie", sessionCookie(token));

  return new Response(null, {
    status: 204,
    headers
  });
};

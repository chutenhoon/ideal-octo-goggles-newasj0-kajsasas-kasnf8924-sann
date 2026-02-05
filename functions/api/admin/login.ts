import type { Env } from "../../_lib/env";
import { errorJson } from "../../_lib/response";
import { adminSessionCookie } from "../../_lib/adminAuth";

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  let payload: { key?: string } = {};
  try {
    payload = await request.json();
  } catch {
    return errorJson(400, "Invalid request.");
  }

  if (!payload.key || payload.key !== env.ADMIN_PANEL_KEY) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid key" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": adminSessionCookie()
    }
  });
};

import type { Env } from "../../_lib/env";
import { clearAdminSessionCookie } from "../../_lib/adminAuth";

export const onRequest: PagesFunction<Env> = async ({ request }) => {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearAdminSessionCookie()
    }
  });
};

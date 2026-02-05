import type { Env } from "../../_lib/env";
import { clearSessionCookie } from "../../_lib/auth";

export const onRequest: PagesFunction<Env> = async ({ request }) => {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const headers = new Headers();
  headers.set("Set-Cookie", clearSessionCookie());

  return new Response(null, {
    status: 204,
    headers
  });
};

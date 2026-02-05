import type { Env } from "../../../_lib/env";
import { errorJson, json } from "../../../_lib/response";
import { requireAdmin } from "../../../_lib/adminAuth";
import { ensureNotesSchema } from "../../../_lib/noteSchema";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string) {
  return UUID_RE.test(value);
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const guard = requireAdmin(request, env);
  if (guard) return guard;

  await ensureNotesSchema(env);

  if (request.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT id, title, content, created_at, updated_at FROM notes ORDER BY created_at DESC"
    ).all();
    return json(results || []);
  }

  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  let payload: { id?: string; title?: string; content?: string } = {};

  try {
    payload = await request.json();
  } catch {
    return errorJson(400, "Invalid request.");
  }

  const title = payload.title?.toString().trim() || "";
  const content = payload.content?.toString().trim() || "";
  const id = payload.id?.toString().trim() || "";

  if (!title || !content) {
    return errorJson(400, "Missing required fields.");
  }

  if (!id || !isValidUuid(id)) {
    return errorJson(400, "Invalid note id.");
  }

  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO notes (id, title, content, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(id, title, content, now, now)
    .run();

  const created = await env.DB.prepare(
    "SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?"
  )
    .bind(id)
    .first();

  return json({ ok: true, note: created });
};

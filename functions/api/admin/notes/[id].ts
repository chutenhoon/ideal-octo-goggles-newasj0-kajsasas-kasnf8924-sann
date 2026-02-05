import type { Env } from "../../../_lib/env";
import { errorJson, json } from "../../../_lib/response";
import { requireAdmin } from "../../../_lib/adminAuth";
import { ensureNotesSchema } from "../../../_lib/noteSchema";

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  const guard = requireAdmin(request, env);
  if (guard) return guard;

  await ensureNotesSchema(env);

  const id = params.id as string;
  if (!id) return errorJson(400, "Missing id.");

  if (request.method === "GET") {
    const row = await env.DB.prepare(
      "SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?"
    )
      .bind(id)
      .first();
    if (!row) return errorJson(404, "Not found.");
    return json(row);
  }

  if (request.method === "DELETE") {
    const row = await env.DB.prepare(
      "SELECT id FROM notes WHERE id = ?"
    )
      .bind(id)
      .first();
    if (!row) return errorJson(404, "Not found.");

    await env.DB.prepare("DELETE FROM notes WHERE id = ?")
      .bind(id)
      .run();

    return json({ ok: true });
  }

  if (request.method !== "PUT") {
    return new Response(null, { status: 405 });
  }

  let payload: { title?: string; content?: string } = {};

  try {
    payload = await request.json();
  } catch {
    return errorJson(400, "Invalid request.");
  }

  const updates: string[] = [];
  const paramsList: Array<string> = [];

  if (Object.prototype.hasOwnProperty.call(payload, "title")) {
    const title = payload.title?.toString().trim() || "";
    updates.push("title = ?");
    paramsList.push(title);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "content")) {
    const content = payload.content?.toString().trim() || "";
    updates.push("content = ?");
    paramsList.push(content);
  }

  updates.push("updated_at = ?");
  paramsList.push(new Date().toISOString());

  if (updates.length > 0) {
    await env.DB.prepare(
      `UPDATE notes SET ${updates.join(", ")} WHERE id = ?`
    )
      .bind(...paramsList, id)
      .run();
  }

  const updated = await env.DB.prepare(
    "SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?"
  )
    .bind(id)
    .first();

  return json({ ok: true, note: updated });
};

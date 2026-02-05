import type { Env } from "../../_lib/env";
import { json } from "../../_lib/response";

export const onRequest: PagesFunction<Env> = async ({ env }) => {
  return json({ ok: true, appName: env.APP_NAME });
};

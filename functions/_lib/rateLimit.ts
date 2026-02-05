import type { Env } from "./env";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function isRateLimited(env: Env, ip: string) {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const row = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM login_attempts WHERE ip = ? AND ts > ?"
  )
    .bind(ip, windowStart)
    .first<{ count: number }>();

  return (row?.count || 0) >= MAX_ATTEMPTS;
}

export async function recordFailedAttempt(env: Env, ip: string) {
  const now = Date.now();
  await env.DB.prepare("INSERT INTO login_attempts (ip, ts) VALUES (?, ?)")
    .bind(ip, now)
    .run();

  const pruneBefore = now - 24 * 60 * 60 * 1000;
  await env.DB.prepare("DELETE FROM login_attempts WHERE ts < ?")
    .bind(pruneBefore)
    .run();
}

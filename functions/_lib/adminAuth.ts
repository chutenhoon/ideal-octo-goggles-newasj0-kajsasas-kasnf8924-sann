import type { Env } from "./env";
import { errorJson } from "./response";
import { getCookie } from "./auth";

const ADMIN_COOKIE = "admin_session";
const ADMIN_MAX_AGE = 60 * 60 * 12;

export function adminSessionCookie() {
  return `${ADMIN_COOKIE}=1; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${ADMIN_MAX_AGE}`;
}

export function clearAdminSessionCookie() {
  return `${ADMIN_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function isAdminRequest(request: Request) {
  return getCookie(request, ADMIN_COOKIE) === "1";
}

export function requireAdmin(request: Request, _env: Env) {
  if (!isAdminRequest(request)) {
    return errorJson(401, "Unauthorized.");
  }
  return null;
}

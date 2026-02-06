import type { Env } from "./env";
import { errorJson } from "./response";
import { getCookie } from "./auth";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const ADMIN_COOKIE = "admin_session";
const ADMIN_MAX_AGE = 60 * 60 * 12;

type AdminSessionPayload = {
  sub: "admin";
  iat: number;
  exp: number;
  nonce: string;
};

function base64UrlEncode(data: Uint8Array) {
  let binary = "";
  data.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function hmacSha256(key: string, message: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(message)
  );
  return new Uint8Array(signature);
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function adminSecret(env: Env) {
  return `${env.SESSION_SECRET}:${env.ADMIN_PANEL_KEY}`;
}

export async function createAdminSession(env: Env) {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    sub: "admin",
    iat: now,
    exp: now + ADMIN_MAX_AGE,
    nonce: crypto.randomUUID()
  };

  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = await hmacSha256(adminSecret(env), payloadB64);
  const signatureB64 = base64UrlEncode(signature);
  return `${payloadB64}.${signatureB64}`;
}

async function verifyAdminSession(env: Env, token: string) {
  const [payloadB64, signatureB64] = token.split(".");
  if (!payloadB64 || !signatureB64) return null;

  try {
    const expectedSignature = await hmacSha256(adminSecret(env), payloadB64);
    const expectedSignatureB64 = base64UrlEncode(expectedSignature);
    if (!timingSafeEqual(signatureB64, expectedSignatureB64)) return null;

    const payloadBytes = base64UrlDecode(payloadB64);
    const payload = JSON.parse(decoder.decode(payloadBytes)) as AdminSessionPayload;
    if (payload.sub !== "admin") return null;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function adminSessionCookie(token: string) {
  return `${ADMIN_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${ADMIN_MAX_AGE}`;
}

export function clearAdminSessionCookie() {
  return `${ADMIN_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export async function isAdminRequest(request: Request, env: Env) {
  const token = getCookie(request, ADMIN_COOKIE);
  if (!token) return false;
  const session = await verifyAdminSession(env, token);
  return Boolean(session);
}

export async function requireAdmin(request: Request, env: Env) {
  if (!(await isAdminRequest(request, env))) {
    return errorJson(401, "Unauthorized.");
  }
  return null;
}

const encoder = new TextEncoder();

export const SESSION_COOKIE = "vms_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  sub: string;
  iat: number;
  exp: number;
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

export async function createSession(secret: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: "vault",
    iat: now,
    exp: now + SESSION_DURATION_SECONDS
  };

  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = await hmacSha256(secret, payloadB64);
  const signatureB64 = base64UrlEncode(signature);
  return `${payloadB64}.${signatureB64}`;
}

export async function verifySession(secret: string, token: string) {
  const [payloadB64, signatureB64] = token.split(".");
  if (!payloadB64 || !signatureB64) return null;

  const expectedSignature = await hmacSha256(secret, payloadB64);
  const expectedSignatureB64 = base64UrlEncode(expectedSignature);
  if (!timingSafeEqual(signatureB64, expectedSignatureB64)) return null;

  const payloadBytes = base64UrlDecode(payloadB64);
  const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as SessionPayload;

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

export function getCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const parts = cookieHeader.split(";").map((part) => part.trim());
  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === name) {
      return value;
    }
  }
  return null;
}

export function sessionCookie(token: string) {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_DURATION_SECONDS}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

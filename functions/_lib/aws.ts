const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(message: string) {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(message));
  return toHex(hash);
}

async function hmacSha256(key: Uint8Array, message: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
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

function encodeRfc3986(value: string) {
  return encodeURIComponent(value)
    .replace(
      /[!'()*]/g,
      (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
    )
    .replace(/%7E/g, "~");
}

function canonicalUri(pathname: string) {
  return pathname
    .split("/")
    .map((segment) => encodeRfc3986(segment))
    .join("/");
}

function canonicalQuery(params: Record<string, string>) {
  return Object.keys(params)
    .sort()
    .map((key) => {
      return `${encodeRfc3986(key)}=${encodeRfc3986(params[key])}`;
    })
    .join("&");
}

function getAmzDate(date = new Date()) {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

async function getSigningKey(secret: string, dateStamp: string, region: string) {
  const kDate = await hmacSha256(
    encoder.encode(`AWS4${secret}`),
    dateStamp
  );
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, "s3");
  const kSigning = await hmacSha256(kService, "aws4_request");
  return kSigning;
}

export async function signRequest(params: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}) {
  const { method, url, headers = {}, body = "", accessKeyId, secretAccessKey, region } = params;
  const parsedUrl = new URL(url);
  const amzDate = getAmzDate();
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = await sha256Hex(body);

  const requestHeaders = new Headers(headers);
  requestHeaders.set("host", parsedUrl.host);
  requestHeaders.set("x-amz-date", amzDate);
  requestHeaders.set("x-amz-content-sha256", payloadHash);

  const headerEntries = Array.from(requestHeaders.entries())
    .map(([key, value]) => [key.toLowerCase(), value.trim().replace(/\s+/g, " ")])
    .sort((a, b) => a[0].localeCompare(b[0]));

  const canonicalHeaders = headerEntries
    .map(([key, value]) => `${key}:${value}\n`)
    .join("");
  const signedHeaders = headerEntries.map(([key]) => key).join(";");

  const queryParams: Record<string, string> = {};
  parsedUrl.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const canonicalRequest = [
    method,
    canonicalUri(parsedUrl.pathname),
    canonicalQuery(queryParams),
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");

  const hashedCanonicalRequest = await sha256Hex(canonicalRequest);
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    hashedCanonicalRequest
  ].join("\n");

  const signingKey = await getSigningKey(secretAccessKey, dateStamp, region);
  const signature = await hmacSha256(signingKey, stringToSign);

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${toHex(signature)}`;
  requestHeaders.set("Authorization", authorization);

  return requestHeaders;
}

export async function presignUrl(params: {
  method: string;
  url: string;
  query: Record<string, string>;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  expires: number;
  headers?: Record<string, string>;
}) {
  const {
    method,
    url,
    query,
    accessKeyId,
    secretAccessKey,
    region,
    expires,
    headers = {}
  } = params;
  const parsedUrl = new URL(url);
  const amzDate = getAmzDate();
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;

  const extraHeaderEntries = Object.entries(headers)
    .map(([key, value]) => [key.toLowerCase(), value.trim().replace(/\s+/g, " ")])
    .filter(([key]) => key !== "host");

  const headerEntries = [
    ["host", parsedUrl.host],
    ...extraHeaderEntries
  ].sort((a, b) => a[0].localeCompare(b[0]));

  const signedHeaders = headerEntries.map(([key]) => key).join(";");
  const queryParams: Record<string, string> = {
    ...query,
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": expires.toString(),
    "X-Amz-SignedHeaders": signedHeaders
  };

  const canonicalHeaders = headerEntries
    .map(([key, value]) => `${key}:${value}\n`)
    .join("");

  const canonicalRequest = [
    method,
    canonicalUri(parsedUrl.pathname),
    canonicalQuery(queryParams),
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD"
  ].join("\n");

  const hashedCanonicalRequest = await sha256Hex(canonicalRequest);
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    hashedCanonicalRequest
  ].join("\n");

  const signingKey = await getSigningKey(secretAccessKey, dateStamp, region);
  const signature = await hmacSha256(signingKey, stringToSign);

  const finalQuery = `${canonicalQuery(queryParams)}&X-Amz-Signature=${toHex(
    signature
  )}`;

  return `${parsedUrl.origin}${parsedUrl.pathname}?${finalQuery}`;
}

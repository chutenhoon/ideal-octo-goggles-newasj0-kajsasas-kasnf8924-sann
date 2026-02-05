import type { Env } from "./env";
import { presignUrl, signRequest } from "./aws";

const REGION = "auto";
const PRESIGN_EXPIRES = 3600;

function normalizeEndpoint(endpoint: string) {
  return endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
}

export function buildObjectUrl(env: Env, key: string) {
  const endpoint = normalizeEndpoint(env.R2_S3_ENDPOINT.trim());
  const bucket = env.R2_S3_BUCKET.trim();

  try {
    const url = new URL(endpoint);
    const path = url.pathname.replace(/\/+$/, "");
    if (path && path !== "/") {
      const segments = path.split("/").filter(Boolean);
      const last = segments[segments.length - 1];
      if (last === bucket) {
        return `${endpoint}/${key}`;
      }
    }
  } catch {
    // If the endpoint is not a valid URL, fall back to naive concatenation.
  }

  return `${endpoint}/${bucket}/${key}`;
}

export async function createMultipartUpload(
  env: Env,
  key: string,
  contentType: string
) {
  const accessKeyId = env.R2_S3_ACCESS_KEY_ID.trim();
  const secretAccessKey = env.R2_S3_SECRET_ACCESS_KEY.trim();
  const url = `${buildObjectUrl(env, key)}?uploads`;
  const headers = await signRequest({
    method: "POST",
    url,
    headers: {
      "content-type": contentType
    },
    body: "",
    accessKeyId,
    secretAccessKey,
    region: REGION
  });

  const response = await fetch(url, {
    method: "POST",
    headers
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Create upload failed: ${body}`);
  }

  const xml = await response.text();
  const match = /<UploadId>([^<]+)<\/UploadId>/.exec(xml);
  if (!match) {
    throw new Error("UploadId not found");
  }

  return match[1];
}

export async function presignPartUpload(
  env: Env,
  key: string,
  uploadId: string,
  partNumber: number
) {
  const accessKeyId = env.R2_S3_ACCESS_KEY_ID.trim();
  const secretAccessKey = env.R2_S3_SECRET_ACCESS_KEY.trim();
  const url = buildObjectUrl(env, key);
  return presignUrl({
    method: "PUT",
    url,
    query: {
      partNumber: partNumber.toString(),
      uploadId
    },
    accessKeyId,
    secretAccessKey,
    region: REGION,
    expires: PRESIGN_EXPIRES
  });
}

export async function presignObjectUpload(
  env: Env,
  key: string,
  contentType?: string
) {
  const accessKeyId = env.R2_S3_ACCESS_KEY_ID.trim();
  const secretAccessKey = env.R2_S3_SECRET_ACCESS_KEY.trim();
  const url = buildObjectUrl(env, key);
  return presignUrl({
    method: "PUT",
    url,
    query: {},
    headers: contentType ? { "content-type": contentType } : undefined,
    accessKeyId,
    secretAccessKey,
    region: REGION,
    expires: PRESIGN_EXPIRES
  });
}

export async function completeMultipartUpload(
  env: Env,
  key: string,
  uploadId: string,
  parts: Array<{ partNumber: number; etag: string }>
) {
  const accessKeyId = env.R2_S3_ACCESS_KEY_ID.trim();
  const secretAccessKey = env.R2_S3_SECRET_ACCESS_KEY.trim();
  const sorted = [...parts].sort((a, b) => a.partNumber - b.partNumber);
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<CompleteMultipartUpload>\n${sorted
    .map(
      (part) =>
        `  <Part><PartNumber>${part.partNumber}</PartNumber><ETag>"${part.etag}"</ETag></Part>`
    )
    .join("\n")}\n</CompleteMultipartUpload>`;

  const url = `${buildObjectUrl(env, key)}?uploadId=${encodeURIComponent(
    uploadId
  )}`;

  const headers = await signRequest({
    method: "POST",
    url,
    headers: {
      "content-type": "application/xml"
    },
    body,
    accessKeyId,
    secretAccessKey,
    region: REGION
  });

  const response = await fetch(url, {
    method: "POST",
    headers,
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Complete upload failed: ${text}`);
  }
}

export async function listMultipartParts(
  env: Env,
  key: string,
  uploadId: string
) {
  const accessKeyId = env.R2_S3_ACCESS_KEY_ID.trim();
  const secretAccessKey = env.R2_S3_SECRET_ACCESS_KEY.trim();
  let marker = 0;
  const collected: Array<{ partNumber: number; etag: string }> = [];

  while (true) {
    const url = `${buildObjectUrl(env, key)}?uploadId=${encodeURIComponent(
      uploadId
    )}&part-number-marker=${marker}`;

    const headers = await signRequest({
      method: "GET",
      url,
      headers: {},
      body: "",
      accessKeyId,
      secretAccessKey,
      region: REGION
    });

    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`List parts failed: ${text}`);
    }

    const xml = await response.text();
    const partRegex =
      /<Part>[\s\S]*?<PartNumber>(\d+)<\/PartNumber>[\s\S]*?<ETag>"?([^"<]+)"?<\/ETag>[\s\S]*?<\/Part>/g;
    let match: RegExpExecArray | null;
    while ((match = partRegex.exec(xml)) !== null) {
      const partNumber = Number(match[1]);
      if (!Number.isNaN(partNumber)) {
        collected.push({ partNumber, etag: match[2] });
      }
    }

    const truncated = /<IsTruncated>(true|false)<\/IsTruncated>/.exec(xml);
    if (!truncated || truncated[1] !== "true") {
      break;
    }

    const nextMarker = /<NextPartNumberMarker>(\d+)<\/NextPartNumberMarker>/.exec(
      xml
    );
    if (!nextMarker) {
      break;
    }

    marker = Number(nextMarker[1]);
    if (Number.isNaN(marker)) {
      break;
    }
  }

  return collected;
}

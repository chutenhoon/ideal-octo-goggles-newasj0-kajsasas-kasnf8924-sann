type HlsFile = {
  path: string;
  data: Uint8Array;
  contentType: string;
};

const textDecoder = new TextDecoder();

function normalizePath(value: string) {
  const parts = value.split("/").filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      out.pop();
    } else {
      out.push(part);
    }
  }
  return out.join("/");
}

function dirname(path: string) {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx);
}

function resolveRelative(baseDir: string, rel: string) {
  if (!baseDir) return normalizePath(rel);
  return normalizePath(`${baseDir}/${rel}`);
}

function contentTypeFor(path: string) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  if (lower.endsWith(".ts")) return "video/mp2t";
  if (lower.endsWith(".m4s")) return "video/iso.segment";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

function extractReferencedFiles(m3u8Path: string, content: string) {
  const baseDir = dirname(m3u8Path);
  const refs: string[] = [];
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (/^[a-z]+:\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
      continue;
    }
    const clean = trimmed.split(/[?#]/)[0].trim();
    if (!clean) continue;
    const resolved = resolveRelative(baseDir, clean);
    refs.push(resolved);
  }

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("#")) continue;
    const match = trimmed.match(/URI=\"([^\"]+)\"/i);
    if (!match) continue;
    const uri = match[1];
    if (!uri || /^[a-z]+:\/\//i.test(uri) || uri.startsWith("data:")) {
      continue;
    }
    const clean = uri.split(/[?#]/)[0].trim();
    if (!clean) continue;
    const resolved = resolveRelative(baseDir, clean);
    refs.push(resolved);
  }

  return refs;
}

const EOCD_SIG = 0x06054b50;
const CENTRAL_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;

function readUint32(view: DataView, offset: number) {
  return view.getUint32(offset, true);
}

function readUint16(view: DataView, offset: number) {
  return view.getUint16(offset, true);
}

function findEocd(view: DataView) {
  for (let i = view.byteLength - 22; i >= 0; i -= 1) {
    if (readUint32(view, i) === EOCD_SIG) {
      return i;
    }
  }
  return -1;
}

async function inflateRaw(data: Uint8Array) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("ZIP decompression not supported in this runtime.");
  }
  const stream = new Response(data).body;
  if (!stream) {
    throw new Error("ZIP decompression failed.");
  }
  const decompressed = stream.pipeThrough(
    new DecompressionStream("deflate-raw")
  );
  const ab = await new Response(decompressed).arrayBuffer();
  return new Uint8Array(ab);
}

export async function extractHlsZip(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  const eocd = findEocd(view);
  if (eocd === -1) {
    throw new Error("Invalid ZIP: missing end of central directory.");
  }

  const centralDirSize = readUint32(view, eocd + 12);
  const centralDirOffset = readUint32(view, eocd + 16);

  let offset = centralDirOffset;
  const files: Array<{ name: string; data: Uint8Array }> = [];

  while (offset < centralDirOffset + centralDirSize) {
    if (readUint32(view, offset) !== CENTRAL_SIG) {
      throw new Error("Invalid ZIP: bad central directory header.");
    }

    const compression = readUint16(view, offset + 10);
    const compressedSize = readUint32(view, offset + 20);
    const uncompressedSize = readUint32(view, offset + 24);
    const fileNameLen = readUint16(view, offset + 28);
    const extraLen = readUint16(view, offset + 30);
    const commentLen = readUint16(view, offset + 32);
    const localOffset = readUint32(view, offset + 42);

    const nameBytes = new Uint8Array(
      buffer,
      offset + 46,
      fileNameLen
    );
    const name = textDecoder.decode(nameBytes);

    offset += 46 + fileNameLen + extraLen + commentLen;

    if (!name || name.endsWith("/")) {
      continue;
    }

    if (readUint32(view, localOffset) !== LOCAL_SIG) {
      throw new Error("Invalid ZIP: bad local header.");
    }

    const localNameLen = readUint16(view, localOffset + 26);
    const localExtraLen = readUint16(view, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const compressed = new Uint8Array(buffer, dataStart, compressedSize);

    let data: Uint8Array;
    if (compression === 0) {
      data = compressed;
    } else if (compression === 8) {
      data = await inflateRaw(compressed);
    } else {
      throw new Error(`Unsupported ZIP compression method: ${compression}`);
    }

    if (uncompressedSize && data.length !== uncompressedSize) {
      // Best-effort; continue.
    }

    files.push({ name, data });
  }

  const indexEntry = files.find((entry) =>
    entry.name.toLowerCase().endsWith("index.m3u8")
  );
  if (!indexEntry) {
    throw new Error("HLS ZIP missing index.m3u8.");
  }

  const indexPath = indexEntry.name;
  const prefix = indexPath.slice(0, indexPath.length - "index.m3u8".length);

  const relMap = new Map<string, Uint8Array>();
  for (const entry of files) {
    if (!entry.name.startsWith(prefix)) continue;
    const rel = normalizePath(entry.name.slice(prefix.length));
    if (!rel) continue;
    relMap.set(rel, entry.data);
  }

  const missing: string[] = [];
  for (const [relPath, data] of relMap) {
    if (!relPath.toLowerCase().endsWith(".m3u8")) continue;
    const content = textDecoder.decode(data);
    const refs = extractReferencedFiles(relPath, content);
    for (const ref of refs) {
      if (!relMap.has(ref)) {
        missing.push(ref);
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(`HLS ZIP missing referenced files: ${missing[0]}`);
  }

  const filesOut: HlsFile[] = [];
  for (const [relPath, data] of relMap) {
    filesOut.push({
      path: relPath,
      data,
      contentType: contentTypeFor(relPath)
    });
  }

  if (!relMap.has("index.m3u8")) {
    throw new Error("HLS ZIP index.m3u8 must be at root.");
  }

  return {
    files: filesOut,
    masterPath: "index.m3u8"
  };
}

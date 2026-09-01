/**
 * MIME type detection and file extension helpers.
 */

// Magic byte signatures for common file formats
const MAGIC_SIGNATURES: Array<{
  mime: string;
  ext: string;
  bytes: number[];
  mask?: number[];
  offset?: number;
}> = [
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  { mime: "image/png", ext: "png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // JPEG: FF D8 FF
  { mime: "image/jpeg", ext: "jpg", bytes: [0xff, 0xd8, 0xff] },
  // GIF: 47 49 46 38
  { mime: "image/gif", ext: "gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  // WebP: RIFF .... WEBP
  { mime: "image/webp", ext: "webp", bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
  // PDF: %PDF-
  { mime: "application/pdf", ext: "pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  // ZIP / DOCX / XLSX / JAR: 50 4B 03 04
  { mime: "application/zip", ext: "zip", bytes: [0x50, 0x4b, 0x03, 0x04] },
  // GZIP: 1F 8B
  { mime: "application/gzip", ext: "gz", bytes: [0x1f, 0x8b] },
  // MP4: ....ftyp
  { mime: "video/mp4", ext: "mp4", bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
  // MP3: ID3 or FF FB
  { mime: "audio/mpeg", ext: "mp3", bytes: [0x49, 0x44, 0x33] },
  { mime: "audio/mpeg", ext: "mp3", bytes: [0xff, 0xfb] },
  // SVG: <?xml or <svg
  { mime: "image/svg+xml", ext: "svg", bytes: [0x3c, 0x73, 0x76, 0x67] }, // <svg
  { mime: "image/svg+xml", ext: "svg", bytes: [0x3c, 0x3f, 0x78, 0x6d, 0x6c] }, // <?xml
  // JSON: { or [
  { mime: "application/json", ext: "json", bytes: [0x7b] },
  { mime: "application/json", ext: "json", bytes: [0x5b] },
];

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "image/x-icon": "ico",
  "application/pdf": "pdf",
  "application/json": "json",
  "application/zip": "zip",
  "application/gzip": "gz",
  "text/plain": "txt",
  "text/csv": "csv",
  "text/html": "html",
  "video/mp4": "mp4",
  "audio/mpeg": "mp3",
  "application/octet-stream": "bin",
};

/**
 * Detect MIME type from buffer magic bytes.
 */
export function detectMimeFromBuffer(buffer: Uint8Array): { mime: string; ext: string } | null {
  if (buffer.length === 0) return null;

  // Check WebP specifically (RIFF header at 0, WEBP at 8)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mime: "image/webp", ext: "webp" };
  }

  for (const sig of MAGIC_SIGNATURES) {
    const offset = sig.offset || 0;
    if (buffer.length < offset + sig.bytes.length) continue;

    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[offset + i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      return { mime: sig.mime, ext: sig.ext };
    }
  }

  return null;
}

/**
 * Extract MIME type from Data URI prefix if present.
 * Example: `data:image/png;base64,iVBORw0...` -> { mime: 'image/png', rawBase64: 'iVBORw0...' }
 */
export function parseDataUri(data: string): { mime?: string; rawBase64: string } {
  const trimmed = data.trim();
  if (trimmed.startsWith("data:")) {
    const match = trimmed.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?(?:;base64)?,(.*)$/s);
    if (match) {
      const mime = match[1] ? match[1].trim() : undefined;
      const rawBase64 = match[2] ? match[2].trim() : "";
      return { mime, rawBase64 };
    }
  }
  return { rawBase64: trimmed };
}

/**
 * Get extension for a given MIME type.
 */
export function getExtensionFromMime(mime: string): string {
  const normalized = mime.toLowerCase().split(";")[0].trim();
  return MIME_TO_EXT[normalized] || "bin";
}

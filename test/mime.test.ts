import { test, expect, describe } from "bun:test";
import { detectMimeFromBuffer, parseDataUri, getExtensionFromMime } from "../src/mime";

describe("MIME & File Utils", () => {
  test("detects PNG magic bytes", () => {
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const detected = detectMimeFromBuffer(pngHeader);
    expect(detected).not.toBeNull();
    expect(detected?.mime).toBe("image/png");
    expect(detected?.ext).toBe("png");
  });

  test("detects JPEG magic bytes", () => {
    const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const detected = detectMimeFromBuffer(jpegHeader);
    expect(detected).not.toBeNull();
    expect(detected?.mime).toBe("image/jpeg");
    expect(detected?.ext).toBe("jpg");
  });

  test("detects PDF magic bytes", () => {
    const pdfHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
    const detected = detectMimeFromBuffer(pdfHeader);
    expect(detected).not.toBeNull();
    expect(detected?.mime).toBe("application/pdf");
    expect(detected?.ext).toBe("pdf");
  });

  test("parses Data URI with mime type prefix", () => {
    const uri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const parsed = parseDataUri(uri);
    expect(parsed.mime).toBe("image/png");
    expect(parsed.rawBase64.startsWith("iVBORw0K")).toBe(true);
  });

  test("parses raw base64 without prefix", () => {
    const raw = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const parsed = parseDataUri(raw);
    expect(parsed.mime).toBeUndefined();
    expect(parsed.rawBase64).toBe(raw);
  });

  test("maps mime types to file extensions", () => {
    expect(getExtensionFromMime("image/png")).toBe("png");
    expect(getExtensionFromMime("image/jpeg")).toBe("jpg");
    expect(getExtensionFromMime("application/pdf")).toBe("pdf");
    expect(getExtensionFromMime("application/unknown")).toBe("bin");
  });
});

import { test, expect, describe, afterAll } from "bun:test";
import { parseCsvStream } from "../src/csv";
import { unlink } from "fs/promises";

describe("CSV Parser", () => {
  const testCsvPath = "/tmp/test_vfs_import.csv";

  afterAll(async () => {
    try {
      await unlink(testCsvPath);
    } catch {}
  });

  test("parses standard CSV with key and data headers", async () => {
    const csvContent = `key,data\nitem1,aGVsbG8=\nitem2,d29ybGQ=`;
    await Bun.write(testCsvPath, csvContent);

    const rows = [];
    for await (const row of parseCsvStream(testCsvPath)) {
      rows.push(row);
    }

    expect(rows.length).toBe(2);
    expect(rows[0].key).toBe("item1");
    expect(rows[0].data).toBe("aGVsbG8=");
    expect(rows[1].key).toBe("item2");
    expect(rows[1].data).toBe("d29ybGQ=");
  });

  test("parses CSV with quoted fields and commas", async () => {
    const csvContent = `key,data,metadata\n"user,01","aGVsbG8=","{""source"":""test""}"`;
    await Bun.write(testCsvPath, csvContent);

    const rows = [];
    for await (const row of parseCsvStream(testCsvPath)) {
      rows.push(row);
    }

    expect(rows.length).toBe(1);
    expect(rows[0].key).toBe("user,01");
    expect(rows[0].data).toBe("aGVsbG8=");
    expect(rows[0].metadata).toBe('{"source":"test"}');
  });

  test("parses CSV without headers fallback", async () => {
    const csvContent = `custom_key_1,aGVsbG8=\ncustom_key_2,d29ybGQ=`;
    await Bun.write(testCsvPath, csvContent);

    const rows = [];
    for await (const row of parseCsvStream(testCsvPath)) {
      rows.push(row);
    }

    expect(rows.length).toBe(2);
    expect(rows[0].key).toBe("custom_key_1");
    expect(rows[0].data).toBe("aGVsbG8=");
    expect(rows[1].key).toBe("custom_key_2");
    expect(rows[1].data).toBe("d29ybGQ=");
  });
});

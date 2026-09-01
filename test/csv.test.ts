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

  test("parses standard CSV and ignores header row from data", async () => {
    const csvContent = `key,data\nitem1,aGVsbG8=\nitem2,d29ybGQ=`;
    await Bun.write(testCsvPath, csvContent);

    const rows = [];
    for await (const row of parseCsvStream(testCsvPath, { hasHeader: true })) {
      rows.push(row);
    }

    // Row count should be 2 (item1, item2), 'key,data' must NOT be in rows
    expect(rows.length).toBe(2);
    expect(rows[0].key).toBe("item1");
    expect(rows[0].data).toBe("aGVsbG8=");
    expect(rows[1].key).toBe("item2");
    expect(rows[1].data).toBe("d29ybGQ=");
  });

  test("ignores custom named header row from upload", async () => {
    const csvContent = `user_identifier,avatar_payload,extra\nusr_001,aGVsbG8=,foo\nusr_002,d29ybGQ=,bar`;
    await Bun.write(testCsvPath, csvContent);

    const rows = [];
    for await (const row of parseCsvStream(testCsvPath, {
      hasHeader: true,
      keyCol: "user_identifier",
      dataCol: "avatar_payload",
    })) {
      rows.push(row);
    }

    expect(rows.length).toBe(2);
    expect(rows[0].key).toBe("usr_001");
    expect(rows[0].data).toBe("aGVsbG8=");
    expect(rows[1].key).toBe("usr_002");
    expect(rows[1].data).toBe("d29ybGQ=");
  });

  test("parses CSV with quoted fields and commas without header in upload", async () => {
    const csvContent = `key,data,metadata\n"user,01","aGVsbG8=","{""source"":""test""}"`;
    await Bun.write(testCsvPath, csvContent);

    const rows = [];
    for await (const row of parseCsvStream(testCsvPath, { hasHeader: true })) {
      rows.push(row);
    }

    expect(rows.length).toBe(1);
    expect(rows[0].key).toBe("user,01");
    expect(rows[0].data).toBe("aGVsbG8=");
    expect(rows[0].metadata).toBe('{"source":"test"}');
  });

  test("processes first row as data when hasHeader is false", async () => {
    const csvContent = `custom_key_1,aGVsbG8=\ncustom_key_2,d29ybGQ=`;
    await Bun.write(testCsvPath, csvContent);

    const rows = [];
    for await (const row of parseCsvStream(testCsvPath, { hasHeader: false })) {
      rows.push(row);
    }

    expect(rows.length).toBe(2);
    expect(rows[0].key).toBe("custom_key_1");
    expect(rows[0].data).toBe("aGVsbG8=");
    expect(rows[1].key).toBe("custom_key_2");
    expect(rows[1].data).toBe("d29ybGQ=");
  });
});

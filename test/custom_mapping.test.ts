import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { runWorkerPool } from "../src/pool";
import { parseCsvStream } from "../src/csv";
import { parseCliArgs } from "../src/config";
import { unlink } from "fs/promises";

describe("Custom Column & Output Format Mapping", () => {
  const originalFetch = globalThis.fetch;
  const testInputCsv = "/tmp/test_custom_input.csv";
  const testOutputCsv = "/tmp/test_custom_output.csv";
  const testOutputJson = "/tmp/test_custom_output.json";

  beforeEach(() => {
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const formData = init?.body as FormData;
      const name = formData.get("name") as string;
      const bucketId = formData.get("bucket_id") as string;

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            url: `https://vfs.example.com/files/${bucketId}/${name}`,
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      );
    };
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    try {
      await unlink(testInputCsv);
      await unlink(testOutputCsv);
      await unlink(testOutputJson);
    } catch {}
  });

  test("generates CSV output with custom headers id and image_url", async () => {
    const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const inputCsvContent = `id,image_base64\nuser_101,${pngBase64}\nuser_102,${pngBase64}`;
    await Bun.write(testInputCsv, inputCsvContent);

    const args = [
      "-i", testInputCsv,
      "-o", testOutputCsv,
      "--key-col", "id",
      "--data-col", "image_base64",
      "--output-key-header", "id",
      "--output-url-header", "image_url",
    ];

    const options = parseCliArgs(args);
    expect(options.outputFormat).toBe("csv");
    expect(options.outputKeyHeader).toBe("id");
    expect(options.outputUrlHeader).toBe("image_url");

    const rowStream = parseCsvStream(testInputCsv, options);
    const summary = await runWorkerPool(rowStream, options);

    expect(summary.total).toBe(2);
    expect(summary.succeeded).toBe(2);

    const outputCsvText = await Bun.file(testOutputCsv).text();
    const lines = outputCsvText.trim().split("\n");

    expect(lines[0]).toBe("id,image_url,success,file_id,error");
    expect(outputCsvText).toContain("user_101,https://vfs.example.com/files/demo/user_101.png,true,,");
    expect(outputCsvText).toContain("user_102,https://vfs.example.com/files/demo/user_102.png,true,,");
  });

  test("supports --output-headers shortcut flag", async () => {
    const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const inputCsvContent = `sku,photo\nITEM_99,${pngBase64}`;
    await Bun.write(testInputCsv, inputCsvContent);

    const args = [
      "-i", testInputCsv,
      "-o", testOutputCsv,
      "--key-col", "sku",
      "--data-col", "photo",
      "--output-headers", "product_id,asset_url",
    ];

    const options = parseCliArgs(args);
    expect(options.outputKeyHeader).toBe("product_id");
    expect(options.outputUrlHeader).toBe("asset_url");

    const rowStream = parseCsvStream(testInputCsv, options);
    await runWorkerPool(rowStream, options);

    const outputCsvText = await Bun.file(testOutputCsv).text();
    const lines = outputCsvText.trim().split("\n");

    expect(lines[0]).toBe("product_id,asset_url,success,file_id,error");
    expect(lines[1]).toContain("ITEM_99,https://vfs.example.com/files/demo/ITEM_99.png,true,,");
  });

  test("generates JSON output with custom property names", async () => {
    const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const inputCsvContent = `user_id,avatar\nusr_1,${pngBase64}`;
    await Bun.write(testInputCsv, inputCsvContent);

    const options = parseCliArgs([
      "-i", testInputCsv,
      "-o", testOutputJson,
      "--key-col", "user_id",
      "--data-col", "avatar",
      "--output-key-header", "id",
      "--output-url-header", "image_url",
    ]);

    const rowStream = parseCsvStream(testInputCsv, options);
    await runWorkerPool(rowStream, options);

    const outputJson = await Bun.file(testOutputJson).json();
    expect(outputJson.items.length).toBe(1);
    expect(outputJson.items[0].id).toBe("usr_1");
    expect(outputJson.items[0].image_url).toBe("https://vfs.example.com/files/demo/usr_1.png");
  });
});

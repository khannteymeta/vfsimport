import { parseArgs } from "util";
import type { CliOptions, OutputFormat } from "./types";

export const DEFAULT_SERVER_URL = "https://vfs-server-dev-devx1.ctdn.dev";

export function printHelp(): void {
  console.log(`
vfsimport - High performance CSV to VFS Server batch uploader using Bun

USAGE:
  vfsimport -i <input.csv> [options]
  bun run index.ts -i <input.csv> [options]

REQUIRED:
  -i, --input <path>               Path to the CSV file

OUTPUT OPTIONS:
  -o, --output <path>              Path to output file (default: "output.json")
  -f, --format <json|csv|auto>     Output format (default: auto-detect from extension)
      --output-key-header <name>   Custom key column header in output (default: "key" or input column name)
      --output-url-header <name>   Custom URL column header in output (default: "url")
      --output-headers <key,url>   Comma-separated output headers, e.g. "id,image_url"

INPUT COLUMN MAPPING:
      --key-col <name|index>       Input column name or 0-based index for Key/ID (default: detects "key"/"id" or 0)
      --data-col <name|index>      Input column name or 0-based index for Base64 Data (default: detects "data"/"base64" or 1)
      --meta-col <name|index>      Input column name or 0-based index for Metadata
      --name-col <name|index>      Input column name or 0-based index for Filename
      --mime-col <name|index>      Input column name or 0-based index for MIME type

SERVER & UPLOAD OPTIONS:
  -u, --url <url>                  VFS server URL (default: "${DEFAULT_SERVER_URL}")
      --api-key <key>              VFS API Key (sets 'x-api-key' header)
      --api-hash <hash>            VFS API Hash (sets 'x-api-hash' header)
  -b, --bucket <bucket_id>         VFS Bucket ID (default: "demo")
  -s, --store <store>              VFS Store type (e.g. "local", default: undefined)
  -m, --metadata <json>            Metadata JSON string (e.g. '{"source":"import"}')
      --mime-type <mime>           Fallback MIME type when base64 has no prefix (e.g. "image/png")
  -c, --concurrency <number>       Number of parallel workers (default: 5)
      --chunk-size <number>        Streaming chunk batch size (default: 50)
      --tmp-dir <path>             Directory to store temporary files (default: system OS tmp dir)
      --keep-tmp                   Do not delete temporary files after upload
  -v, --verbose                    Enable verbose logging
  -h, --help                       Show this help message
      --version                    Show version

EXAMPLES:
  # Output as CSV with custom headers 'id' and 'image_url'
  vfsimport -i input.csv -o output.csv --output-key-header id --output-url-header image_url

  # Custom input columns and CSV output
  vfsimport -i users.csv -o result.csv --key-col user_id --data-col avatar_base64 --output-headers "id,image_url"

  # Fast import with API key and concurrency 10
  vfsimport -i data.csv -o results.json --api-key "secret-key" -c 10
`);
}

export function parseCliArgs(argv: string[] = process.argv.slice(2)): CliOptions {
  const optionsConfig = {
    input: { type: "string" as const, short: "i" },
    output: { type: "string" as const, short: "o", default: "output.json" },
    format: { type: "string" as const, short: "f" },
    "output-key-header": { type: "string" as const },
    "output-url-header": { type: "string" as const },
    "output-headers": { type: "string" as const },

    "key-col": { type: "string" as const },
    "input-key": { type: "string" as const },
    "data-col": { type: "string" as const },
    "input-data": { type: "string" as const },
    "meta-col": { type: "string" as const },
    "name-col": { type: "string" as const },
    "mime-col": { type: "string" as const },

    url: { type: "string" as const, short: "u" },
    "api-key": { type: "string" as const },
    "api-hash": { type: "string" as const },
    bucket: { type: "string" as const, short: "b" },
    store: { type: "string" as const, short: "s" },
    metadata: { type: "string" as const, short: "m" },
    "mime-type": { type: "string" as const },
    mime: { type: "string" as const },
    concurrency: { type: "string" as const, short: "c" },
    "chunk-size": { type: "string" as const },
    "tmp-dir": { type: "string" as const },
    "keep-tmp": { type: "boolean" as const, default: false },
    verbose: { type: "boolean" as const, short: "v", default: false },
    help: { type: "boolean" as const, short: "h", default: false },
    version: { type: "boolean" as const, default: false },
  };

  let values: Record<string, string | boolean | undefined>;
  try {
    const parsed = parseArgs({
      args: argv,
      options: optionsConfig,
      allowPositionals: true,
      strict: false,
    });
    values = parsed.values;
  } catch (err: any) {
    console.error(`Error parsing arguments: ${err.message}`);
    process.exit(1);
  }

  if (values.help) {
    return {
      input: "",
      output: "output.json",
      outputFormat: "auto",
      outputKeyHeader: "key",
      outputUrlHeader: "url",
      url: "",
      concurrency: 5,
      chunkSize: 50,
      cleanTmp: true,
      help: true,
    };
  }

  if (values.version) {
    return {
      input: "",
      output: "output.json",
      outputFormat: "auto",
      outputKeyHeader: "key",
      outputUrlHeader: "url",
      url: "",
      concurrency: 5,
      chunkSize: 50,
      cleanTmp: true,
      version: true,
    };
  }

  const rawUrl =
    (values.url as string) ||
    process.env.VFS_SERVER_URL ||
    DEFAULT_SERVER_URL;

  let resolvedUrl = rawUrl.trim();
  if (resolvedUrl.endsWith("/")) {
    resolvedUrl = resolvedUrl.slice(0, -1);
  }
  if (!resolvedUrl.endsWith("/api/upload") && !resolvedUrl.endsWith("/upload")) {
    resolvedUrl = `${resolvedUrl}/api/upload`;
  }

  const concurrencyParsed = parseInt(
    (values.concurrency as string) || process.env.VFS_CONCURRENCY || "5",
    10
  );
  const concurrency = isNaN(concurrencyParsed) || concurrencyParsed < 1 ? 5 : concurrencyParsed;

  const chunkSizeParsed = parseInt(
    (values["chunk-size"] as string) || process.env.VFS_CHUNK_SIZE || "50",
    10
  );
  const chunkSize = isNaN(chunkSizeParsed) || chunkSizeParsed < 1 ? 50 : chunkSizeParsed;

  const input = (values.input as string) || "";
  const output = (values.output as string) || "output.json";

  // Determine output format
  let rawFormat = (
    (values.format as string) ||
    process.env.VFS_OUTPUT_FORMAT ||
    "auto"
  ).toLowerCase() as OutputFormat;

  if (rawFormat === "auto") {
    if (output.toLowerCase().endsWith(".csv")) {
      rawFormat = "csv";
    } else {
      rawFormat = "json";
    }
  }

  // Handle custom output headers
  let outputKeyHeader = (values["output-key-header"] as string) || process.env.VFS_OUTPUT_KEY_HEADER;
  let outputUrlHeader = (values["output-url-header"] as string) || process.env.VFS_OUTPUT_URL_HEADER;

  const combinedHeaders = values["output-headers"] as string;
  if (combinedHeaders) {
    const parts = combinedHeaders.split(",").map((s) => s.trim());
    if (parts[0]) outputKeyHeader = parts[0];
    if (parts[1]) outputUrlHeader = parts[1];
  }

  const keyCol = (values["key-col"] as string) || (values["input-key"] as string) || process.env.VFS_KEY_COL;
  const dataCol = (values["data-col"] as string) || (values["input-data"] as string) || process.env.VFS_DATA_COL;
  const metaCol = (values["meta-col"] as string) || process.env.VFS_META_COL;
  const nameCol = (values["name-col"] as string) || process.env.VFS_NAME_COL;
  const mimeCol = (values["mime-col"] as string) || process.env.VFS_MIME_COL;

  // If outputKeyHeader not explicitly set, default to keyCol name if it was a string name, else "key"
  if (!outputKeyHeader) {
    outputKeyHeader = keyCol && isNaN(Number(keyCol)) ? keyCol : "key";
  }
  if (!outputUrlHeader) {
    outputUrlHeader = "url";
  }

  const apiKey =
    (values["api-key"] as string) ||
    process.env.VFS_API_KEY ||
    undefined;

  const apiHash =
    (values["api-hash"] as string) ||
    process.env.VFS_API_HASH ||
    undefined;

  const bucketId =
    (values.bucket as string) ||
    process.env.VFS_BUCKET_ID ||
    "demo";

  const store =
    (values.store as string) ||
    process.env.VFS_STORE ||
    undefined;

  const metadata =
    (values.metadata as string) ||
    process.env.VFS_METADATA ||
    undefined;

  const mimeType =
    (values["mime-type"] as string) ||
    (values.mime as string) ||
    process.env.VFS_MIME_TYPE ||
    undefined;

  const tmpDir = (values["tmp-dir"] as string) || process.env.VFS_TMP_DIR || undefined;
  const keepTmp = Boolean(values["keep-tmp"]);

  return {
    input,
    output,
    outputFormat: rawFormat,
    outputKeyHeader,
    outputUrlHeader,
    keyCol,
    dataCol,
    metaCol,
    nameCol,
    mimeCol,
    url: resolvedUrl,
    apiKey,
    apiHash,
    bucketId,
    store,
    metadata,
    mimeType,
    concurrency,
    chunkSize,
    tmpDir,
    cleanTmp: !keepTmp,
    verbose: Boolean(values.verbose),
  };
}

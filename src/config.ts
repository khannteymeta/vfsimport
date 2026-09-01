import { parseArgs } from "util";
import type { CliOptions } from "./types";

export const DEFAULT_SERVER_URL = "https://vfs-server-dev-devx1.ctdn.dev";

export function printHelp(): void {
  console.log(`
vfsimport - High performance CSV to VFS Server batch uploader using Bun

USAGE:
  vfsimport -i <input.csv> [options]
  bun run index.ts -i <input.csv> [options]

REQUIRED:
  -i, --input <path>         Path to the CSV file containing [key, data]

OPTIONS:
  -o, --output <path>        Path to output JSON file (default: "output.json")
  -u, --url <url>            VFS server URL (default: "${DEFAULT_SERVER_URL}")
      --api-key <key>        VFS API Key (sets 'x-api-key' header)
      --api-hash <hash>      VFS API Hash (sets 'x-api-hash' header)
  -b, --bucket <bucket_id>   VFS Bucket ID (default: "demo")
  -s, --store <store>        VFS Store type (e.g. "local", default: undefined)
  -m, --metadata <json>      Metadata JSON string (e.g. '{"source":"import"}')
      --mime-type <mime>     Fallback MIME type when base64 has no prefix (e.g. "image/png")
  -c, --concurrency <number> Number of parallel workers (default: 5)
      --chunk-size <number>  Streaming chunk batch size (default: 50)
      --tmp-dir <path>       Directory to store temporary files (default: system OS tmp dir)
      --keep-tmp             Do not delete temporary files after upload
  -v, --verbose              Enable verbose logging
  -h, --help                 Show this help message
      --version              Show version

ENVIRONMENT VARIABLES:
  VFS_SERVER_URL             VFS server upload URL
  VFS_API_KEY                Sets 'x-api-key' header
  VFS_API_HASH               Sets 'x-api-hash' header
  VFS_BUCKET_ID              Default bucket ID
  VFS_STORE                  Default store
  VFS_METADATA               Default metadata JSON string
  VFS_MIME_TYPE              Default fallback MIME type
  VFS_CONCURRENCY            Parallel worker count (default: 5)

EXAMPLES:
  # Basic import
  vfsimport -i data.csv -o results.json

  # Import with API Key and custom bucket
  vfsimport -i images.csv --api-key "secret-key" -b "products" -c 10

  # Import with explicit MIME type and store
  vfsimport -i files.csv --mime-type "image/png" --store "local"
`);
}

export function parseCliArgs(argv: string[] = process.argv.slice(2)): CliOptions {
  const optionsConfig = {
    input: { type: "string" as const, short: "i" },
    output: { type: "string" as const, short: "o", default: "output.json" },
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

  // Normalize server upload endpoint URL
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

# vfsimport

A high-performance, memory-safe CSV to VFS Server batch uploader CLI built with [Bun](https://bun.sh).

## Features

- ⚡ **Ultra-Fast & Streaming**: Streams CSV files chunk-by-chunk using Bun file streams without loading entire files into memory, preventing memory overflow on large datasets.
- 🔀 **Controlled Concurrency**: Bounded worker pool to prevent bursting or overloading the VFS server.
- 🔑 **Flexible Authentication**: Supports `VFS_API_KEY` (`x-api-key`), `VFS_API_HASH` (`x-api-hash`), or unauthenticated uploads.
- 🖼️ **Smart MIME & Extension Detection**: Detects file types from data URI prefixes (`data:image/png;base64,...`) and magic bytes (PNG, JPEG, WebP, GIF, PDF, MP4, etc.), with configurable `--mime-type` fallback.
- 🧹 **Temp File Management**: Safely writes base64 buffers to temporary files before upload and automatically unlinks them upon completion.
- 📄 **JSON Output**: Incrementally streams results into a single JSON file (e.g. `output.json`) containing all key-to-URL mappings and upload statuses.

---

## Installation

```bash
bun install
```

To link the CLI globally or run directly:
```bash
bun link
vfsimport --help
```
Or run with `bun run`:
```bash
bun run index.ts -i <file.csv> [options]
```

---

## Usage

```bash
vfsimport -i <input.csv> [options]
```

### Options

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--input <path>` | `-i` | **(Required)** Path to input CSV file containing `[key, data]` | - |
| `--output <path>` | `-o` | Path to output JSON file | `output.json` |
| `--url <url>` | `-u` | VFS Server upload endpoint | `https://vfs-server-dev-devx1.ctdn.dev` |
| `--api-key <key>` | | Sets `x-api-key` header | `undefined` |
| `--api-hash <hash>` | | Sets `x-api-hash` header | `undefined` |
| `--bucket <bucket_id>` | `-b` | VFS Bucket ID | `demo` |
| `--store <store>` | `-s` | VFS Store type (e.g. `local`) | `undefined` |
| `--metadata <json>` | `-m` | Metadata JSON string (e.g. `'{"source":"import"}'`) | `undefined` |
| `--mime-type <mime>` | | Fallback MIME type when base64 has no prefix (e.g. `image/png`) | `undefined` |
| `--concurrency <num>` | `-c` | Number of parallel worker uploads | `5` |
| `--chunk-size <num>` | | Streaming batch size | `50` |
| `--tmp-dir <path>` | | Custom directory for temporary file staging | System OS temp |
| `--keep-tmp` | | Keep temporary files after upload (do not auto-delete) | `false` |
| `--verbose` | `-v` | Verbose per-item log output | `false` |
| `--help` | `-h` | Display help screen | |
| `--version` | | Show version | |

---

## Environment Variables

Bun automatically loads `.env` files in your workspace:

```env
VFS_SERVER_URL=https://vfs-server-dev-devx1.ctdn.dev
VFS_API_KEY=your-api-key-here
VFS_API_HASH=your-api-hash-here
VFS_BUCKET_ID=demo
VFS_STORE=local
VFS_MIME_TYPE=image/png
VFS_CONCURRENCY=10
```

---

## CSV Format

The CSV can include a header row (`key`, `data`, optional `metadata`, `name`, `mime_type`) or use default 1st column = `key`, 2nd column = `data` (base64 string).

### Example with Header:
```csv
key,data
avatar_001,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==
doc_002,data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCDC...
```

### Example without Header:
```csv
item_1,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==
item_2,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==
```

---

## Output JSON Structure

```json
{
  "items": [
    {
      "key": "avatar_001",
      "url": "https://vfs-server-dev-devx1.ctdn.dev/uploads/demo/avatar_001.png",
      "success": true,
      "fileId": "file_01928374",
      "error": null
    }
  ],
  "summary": {
    "total": 1,
    "succeeded": 1,
    "failed": 0,
    "elapsedMs": 120
  }
}
```

---

## Testing

Run unit & integration tests using Bun's test runner:

```bash
bun test
```

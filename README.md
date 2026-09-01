# vfsimport

A high-performance, memory-safe CSV to VFS Server batch uploader CLI built with [Bun](https://bun.sh).

## Features

- ⚡ **Ultra-Fast & Streaming**: Streams CSV files chunk-by-chunk using Bun file streams without loading entire files into memory, preventing memory overflow on large datasets.
- 🔀 **Controlled Concurrency**: Bounded worker pool to prevent bursting or overloading the VFS server.
- 📊 **Flexible Output Formats**: Supports **CSV** and **JSON** output formats with auto-detection or explicit flag (`-f csv` / `-f json`).
- 🏷️ **Custom Column & Header Mapping**: Customize input columns (`--key-col`, `--data-col`) and output headers (`--output-key-header id`, `--output-url-header image_url`, or `--output-headers "id,image_url"`).
- 🔑 **Flexible Authentication**: Supports `VFS_API_KEY` (`x-api-key`), `VFS_API_HASH` (`x-api-hash`), or unauthenticated uploads.
- 🖼️ **Smart MIME & Extension Detection**: Detects file types from data URI prefixes (`data:image/png;base64,...`) and magic bytes (PNG, JPEG, WebP, GIF, PDF, MP4, etc.), with configurable `--mime-type` fallback.
- 🧹 **Temp File Management**: Safely writes base64 buffers to temporary files before upload and automatically unlinks them upon completion.

---

## Installation

```bash
bun install
```

To run directly:
```bash
bun run index.ts -i <file.csv> [options]
```

---

## Usage

```bash
vfsimport -i <input.csv> [options]
```

### Options

#### Input & Output
| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--input <path>` | `-i` | **(Required)** Path to input CSV file | - |
| `--output <path>` | `-o` | Path to output file | `output.json` |
| `--format <json\|csv\|auto>` | `-f` | Output format (auto-detects `.csv` / `.json` extension) | `auto` |
| `--output-key-header <name>` | | Custom key header name in output (e.g. `id`) | `key` |
| `--output-url-header <name>` | | Custom URL header name in output (e.g. `image_url`) | `url` |
| `--output-headers <key,url>` | | Comma-separated output headers (e.g. `"id,image_url"`) | `key,url` |

#### Input Column Mapping
| Flag | Description | Default |
|------|-------------|---------|
| `--key-col <name\|index>` | Input column name or 0-based index for Key/ID | Detects `key`/`id` or col `0` |
| `--data-col <name\|index>` | Input column name or 0-based index for Base64 Data | Detects `data`/`base64` or col `1` |
| `--meta-col <name\|index>` | Input column name or 0-based index for Metadata | Detects `metadata` or col `-1` |
| `--name-col <name\|index>` | Input column name or 0-based index for Filename | Detects `filename` or col `-1` |
| `--mime-col <name\|index>` | Input column name or 0-based index for MIME type | Detects `mimetype` or col `-1` |

#### Server & Upload Options
| Flag | Short | Description | Default |
|------|-------|-------------|---------|
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

---

## Examples

### 1. Output as CSV with Custom Headers (`id`, `image_url`)
```bash
bun run index.ts \
  -i input.csv \
  -o output.csv \
  --output-headers "id,image_url"
```

Output `output.csv`:
```csv
id,image_url,success,file_id,error
user_001,https://vfs-server-dev-devx1.ctdn.dev/uploads/demo/user_001.png,true,file_123,
user_002,https://vfs-server-dev-devx1.ctdn.dev/uploads/demo/user_002.png,true,file_124,
```

### 2. Custom Input Columns to CSV Output
When your input CSV has custom headers like `user_id` and `avatar_base64`:
```bash
bun run index.ts \
  -i users.csv \
  -o output.csv \
  --key-col user_id \
  --data-col avatar_base64 \
  --output-key-header id \
  --output-url-header image_url
```

### 3. Custom Output in JSON Format
```bash
bun run index.ts \
  -i users.csv \
  -o output.json \
  --output-headers "id,image_url"
```

Output `output.json`:
```json
{
  "items": [
    {
      "id": "user_001",
      "image_url": "https://vfs-server-dev-devx1.ctdn.dev/uploads/demo/user_001.png",
      "success": true,
      "fileId": "file_123",
      "error": null
    }
  ],
  "summary": {
    "total": 1,
    "succeeded": 1,
    "failed": 0,
    "elapsedMs": 110
  }
}
```

---

## Testing

```bash
bun test
```

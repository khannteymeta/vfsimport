# vfsimport

A high-performance, memory-safe CSV to VFS Server batch uploader CLI built with [Bun](https://bun.sh).

## Features

- ⚡ **Ultra-Fast & Streaming**: Streams CSV files chunk-by-chunk using Bun file streams without loading entire files into memory, preventing memory overflow on large datasets.
- 📦 **Standalone Cross-Platform Binaries**: Bundle into single standalone executables that run **without needing Bun or Node.js installed**.
- 🔀 **Controlled Concurrency**: Bounded worker pool to prevent bursting or overloading the VFS server.
- 📊 **Flexible Output Formats**: Supports **CSV** and **JSON** output formats with auto-detection or explicit flag (`-f csv` / `-f json`).
- 🏷️ **Custom Column & Header Mapping**: Customize input columns (`--key-col`, `--data-col`) and output headers (`--output-headers "id,image_url"`).
- 🔑 **Flexible Authentication**: Supports `VFS_API_KEY` (`x-api-key`), `VFS_API_HASH` (`x-api-hash`), or unauthenticated uploads.
- 🖼️ **Smart MIME & Extension Detection**: Detects file types from data URI prefixes (`data:image/png;base64,...`) and magic bytes (PNG, JPEG, WebP, GIF, PDF, MP4, etc.), with configurable `--mime-type` fallback.
- 🧹 **Temp File Management**: Safely writes base64 buffers to temporary files before upload and automatically unlinks them upon completion.

---

## Standalone Binary Compilation (No Bun / Node Required)

Bun includes a built-in compiler that bundles your code and the Bun runtime into a single, self-contained standalone binary. Users can run it directly on Linux, macOS, or Windows without installing anything!

### Build for Current OS
```bash
bun run build
# Creates executable: dist/vfsimport
```

### Build for Specific Platforms
```bash
# Linux x86_64
bun run build:linux-x64

# Linux ARM64 (AWS Graviton, Raspberry Pi)
bun run build:linux-arm64

# macOS Apple Silicon (M1/M2/M3/M4)
bun run build:darwin-arm64

# macOS Intel
bun run build:darwin-x64

# Windows x64 (creates .exe)
bun run build:windows-x64
```

### Build for All Platforms at Once
```bash
bun run build:all
```

---

## Running the Standalone Executable

### On macOS / Linux:
```bash
chmod +x ./dist/vfsimport
./dist/vfsimport -i data.csv -o output.csv --output-headers "id,image_url"
```

### On Windows:
```powershell
.\dist\vfsimport-windows-x64.exe -i data.csv -o output.csv --output-headers "id,image_url"
```

---

## Running with Bun (Development)

```bash
bun run index.ts -i <file.csv> [options]
```

---

## Options Reference

#### Input & Output
| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--input <path>` | `-i` | **(Required)** Path to input CSV file | - |
| `--output <path>` | `-o` | Path to output file | `output.json` |
| `--format <json\|csv\|auto>` | `-f` | Output format (auto-detects `.csv` / `.json` extension) | `auto` |
| `--output-key-header <name>` | | Custom key header name in output (e.g. `id`) | `key` |
| `--output-url-header <name>` | | Custom URL header name in output (e.g. `image_url`) | `url` |
| `--output-headers <key,url>` | | Comma-separated output headers (e.g. `"id,image_url"`) | `key,url` |
| `--include-status` | | Include status, file ID, and error columns in output | `false` |

#### CSV Header & Input Column Mapping
| Flag | Description | Default |
|------|-------------|---------|
| `--no-header` | Treat the first row as data instead of column headers | `false` |
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

## Testing

```bash
bun test
```

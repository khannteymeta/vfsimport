#!/usr/bin/env bun
import { parseCliArgs, printHelp, DEFAULT_SERVER_URL } from "./src/config";
import { parseCsvStream } from "./src/csv";
import { runWorkerPool, type ProgressStats } from "./src/pool";
import type { UploadResult } from "./src/types";

const VERSION = "1.0.0";

async function main() {
  const options = parseCliArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (options.version) {
    console.log(`vfsimport v${VERSION}`);
    process.exit(0);
  }

  if (!options.input) {
    console.error("❌ Error: Missing required option: --input <path> or -i <path>\n");
    printHelp();
    process.exit(1);
  }

  const inputFile = Bun.file(options.input);
  if (!(await inputFile.exists())) {
    console.error(`❌ Error: Input CSV file not found: ${options.input}`);
    process.exit(1);
  }

  const authDesc = options.apiKey
    ? "x-api-key [SET]"
    : options.apiHash
    ? "x-api-hash [SET]"
    : "None";

  console.log("══════════════════════════════════════════════════════════════");
  console.log(` 🚀 VFS Import CLI v${VERSION}`);
  console.log("══════════════════════════════════════════════════════════════");
  console.log(` 📄 Input CSV       : ${options.input}`);
  console.log(` 💾 Output JSON     : ${options.output}`);
  console.log(` 🌐 Server URL      : ${options.url}`);
  console.log(` 🔑 Authentication  : ${authDesc}`);
  console.log(` 🪣 Bucket ID       : ${options.bucketId || "demo"}`);
  if (options.store) {
    console.log(` 📦 Store           : ${options.store}`);
  }
  if (options.mimeType) {
    console.log(` 🏷️  Fallback MIME   : ${options.mimeType}`);
  }
  console.log(` ⚡ Concurrency     : ${options.concurrency} parallel workers`);
  console.log("══════════════════════════════════════════════════════════════\n");

  let lastLineLength = 0;
  const isTTY = process.stdout.isTTY;

  const onProgress = (stats: ProgressStats, lastResult?: UploadResult) => {
    if (options.verbose && lastResult) {
      const statusIcon = lastResult.success ? "✅" : "❌";
      const detail = lastResult.success
        ? `-> ${lastResult.url || lastResult.fileId || "Uploaded"}`
        : `-> Error: ${lastResult.error}`;
      console.log(`[${statusIcon}] [${lastResult.key}] (${lastResult.durationMs}ms) ${detail}`);
      return;
    }

    if (isTTY) {
      const line = `⏳ Processed: ${stats.processed} | ✅ Succeeded: ${stats.succeeded} | ❌ Failed: ${stats.failed} | ⚡ Speed: ${stats.speedPerSec.toFixed(1)}/s | 🔄 In-flight: ${stats.inFlight}`;
      process.stdout.write(`\r${line.padEnd(lastLineLength, " ")}`);
      lastLineLength = line.length;
    } else if (stats.processed % 50 === 0 || stats.inFlight === 0) {
      console.log(
        `[Progress] Processed: ${stats.processed} (✅ ${stats.succeeded} / ❌ ${stats.failed}) - ${stats.speedPerSec.toFixed(1)} items/s`
      );
    }
  };

  try {
    const rowGenerator = parseCsvStream(options.input);
    const summary = await runWorkerPool(rowGenerator, options, onProgress);

    if (isTTY) {
      process.stdout.write("\n");
    }

    console.log("\n==============================================================");
    console.log(" 🎉 Import Completed!");
    console.log("==============================================================");
    console.log(` 📊 Total Processed : ${summary.total}`);
    console.log(` ✅ Succeeded       : ${summary.succeeded}`);
    console.log(` ❌ Failed          : ${summary.failed}`);
    console.log(` ⏱️  Duration        : ${(summary.elapsedMs / 1000).toFixed(2)}s`);
    console.log(` 📁 Results written : ${options.output}`);
    console.log("==============================================================\n");

    if (summary.failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`\n❌ Import Failed: ${err.message}`);
    if (options.verbose && err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
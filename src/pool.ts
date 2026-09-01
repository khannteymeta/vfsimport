import type { CliOptions, CsvRow, UploadResult } from "./types";
import { uploadRow } from "./uploader";
import { JsonOutputWriter } from "./output";

export interface ProgressStats {
  processed: number;
  succeeded: number;
  failed: number;
  inFlight: number;
  speedPerSec: number;
  elapsedMs: number;
}

export type ProgressCallback = (stats: ProgressStats, lastResult?: UploadResult) => void;

/**
 * High-performance worker pool that pulls rows lazily with bounded concurrency.
 */
export async function runWorkerPool(
  rowStream: AsyncGenerator<CsvRow, void, unknown>,
  options: CliOptions,
  onProgress?: ProgressCallback
): Promise<{ total: number; succeeded: number; failed: number; elapsedMs: number }> {
  const outputWriter = new JsonOutputWriter(options.output);
  await outputWriter.init();

  const startTime = Date.now();
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  const executing = new Set<Promise<void>>();
  const concurrency = Math.max(1, options.concurrency);

  const notifyProgress = (lastResult?: UploadResult) => {
    if (!onProgress) return;
    const elapsedMs = Math.max(1, Date.now() - startTime);
    const speedPerSec = (processed / elapsedMs) * 1000;
    onProgress(
      {
        processed,
        succeeded,
        failed,
        inFlight: executing.size,
        speedPerSec,
        elapsedMs,
      },
      lastResult
    );
  };

  for await (const row of rowStream) {
    // Process row in a worker task
    const task = (async () => {
      const result = await uploadRow(row, options);
      processed++;
      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }

      await outputWriter.writeResult(result);
      notifyProgress(result);
    })();

    executing.add(task);

    // Clean up finished task from executing set
    task.finally(() => executing.delete(task));

    // If concurrency limit reached, wait for at least one worker to finish before pulling next row
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  // Wait for all remaining active tasks to finish
  if (executing.size > 0) {
    await Promise.all(executing);
  }

  const elapsedMs = Date.now() - startTime;
  await outputWriter.close({ totalRows: processed, elapsedMs });

  return {
    total: processed,
    succeeded,
    failed,
    elapsedMs,
  };
}

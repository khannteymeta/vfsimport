import { open } from "fs/promises";
import type { UploadResult } from "./types";

/**
 * Streaming JSON writer that incrementally writes results to disk to prevent high memory usage.
 */
export class JsonOutputWriter {
  private filePath: string;
  private fileHandle: any = null;
  private isFirst = true;
  private count = 0;
  private successCount = 0;
  private failCount = 0;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async init(): Promise<void> {
    this.fileHandle = await open(this.filePath, "w");
    // Start JSON object with results array
    await this.fileHandle.write('{\n  "items": [\n');
  }

  async writeResult(result: UploadResult): Promise<void> {
    if (!this.fileHandle) {
      await this.init();
    }

    this.count++;
    if (result.success) {
      this.successCount++;
    } else {
      this.failCount++;
    }

    const itemStr = JSON.stringify({
      key: result.key,
      url: result.url || null,
      success: result.success,
      fileId: result.fileId || null,
      error: result.error || null,
    });

    const prefix = this.isFirst ? "    " : ",\n    ";
    this.isFirst = false;

    await this.fileHandle.write(prefix + itemStr);
  }

  async close(summary: { totalRows: number; elapsedMs: number }): Promise<void> {
    if (!this.fileHandle) return;

    // Close array and append summary metadata
    const footer = `\n  ],\n  "summary": {\n    "total": ${this.count},\n    "succeeded": ${this.successCount},\n    "failed": ${this.failCount},\n    "elapsedMs": ${summary.elapsedMs}\n  }\n}\n`;

    await this.fileHandle.write(footer);
    await this.fileHandle.close();
    this.fileHandle = null;
  }
}

import { open } from "fs/promises";
import type { CliOptions, UploadResult } from "./types";

export interface OutputWriter {
  init(): Promise<void>;
  writeResult(result: UploadResult): Promise<void>;
  close(summary: { totalRows: number; elapsedMs: number }): Promise<void>;
}

function escapeCsvField(field: string | null | undefined): string {
  if (field === null || field === undefined) return "";
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Streaming CSV output writer with customizable column headers.
 */
export class CsvOutputWriter implements OutputWriter {
  private filePath: string;
  private fileHandle: any = null;
  private keyHeader: string;
  private urlHeader: string;

  constructor(filePath: string, keyHeader = "key", urlHeader = "url") {
    this.filePath = filePath;
    this.keyHeader = keyHeader;
    this.urlHeader = urlHeader;
  }

  async init(): Promise<void> {
    this.fileHandle = await open(this.filePath, "w");
    // Write header line
    const headerLine = `${escapeCsvField(this.keyHeader)},${escapeCsvField(this.urlHeader)},success,file_id,error\n`;
    await this.fileHandle.write(headerLine);
  }

  async writeResult(result: UploadResult): Promise<void> {
    if (!this.fileHandle) {
      await this.init();
    }

    const row = [
      escapeCsvField(result.key),
      escapeCsvField(result.url || ""),
      result.success ? "true" : "false",
      escapeCsvField(result.fileId || ""),
      escapeCsvField(result.error || ""),
    ].join(",") + "\n";

    await this.fileHandle.write(row);
  }

  async close(_summary: { totalRows: number; elapsedMs: number }): Promise<void> {
    if (!this.fileHandle) return;
    await this.fileHandle.close();
    this.fileHandle = null;
  }
}

/**
 * Streaming JSON output writer.
 */
export class JsonOutputWriter implements OutputWriter {
  private filePath: string;
  private fileHandle: any = null;
  private isFirst = true;
  private count = 0;
  private successCount = 0;
  private failCount = 0;
  private keyHeader: string;
  private urlHeader: string;

  constructor(filePath: string, keyHeader = "key", urlHeader = "url") {
    this.filePath = filePath;
    this.keyHeader = keyHeader;
    this.urlHeader = urlHeader;
  }

  async init(): Promise<void> {
    this.fileHandle = await open(this.filePath, "w");
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

    const record: Record<string, any> = {
      [this.keyHeader]: result.key,
      [this.urlHeader]: result.url || null,
      success: result.success,
      fileId: result.fileId || null,
      error: result.error || null,
    };

    const itemStr = JSON.stringify(record);
    const prefix = this.isFirst ? "    " : ",\n    ";
    this.isFirst = false;

    await this.fileHandle.write(prefix + itemStr);
  }

  async close(summary: { totalRows: number; elapsedMs: number }): Promise<void> {
    if (!this.fileHandle) return;

    const footer = `\n  ],\n  "summary": {\n    "total": ${this.count},\n    "succeeded": ${this.successCount},\n    "failed": ${this.failCount},\n    "elapsedMs": ${summary.elapsedMs}\n  }\n}\n`;

    await this.fileHandle.write(footer);
    await this.fileHandle.close();
    this.fileHandle = null;
  }
}

/**
 * Factory to create appropriate output writer based on options.
 */
export function createOutputWriter(options: CliOptions): OutputWriter {
  const isCsv =
    options.outputFormat === "csv" ||
    (options.outputFormat === "auto" && options.output.toLowerCase().endsWith(".csv"));

  if (isCsv) {
    return new CsvOutputWriter(
      options.output,
      options.outputKeyHeader,
      options.outputUrlHeader
    );
  }

  return new JsonOutputWriter(
    options.output,
    options.outputKeyHeader,
    options.outputUrlHeader
  );
}

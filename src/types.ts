export type OutputFormat = "json" | "csv" | "auto";

export interface CliOptions {
  input: string;
  output: string;
  outputFormat: OutputFormat;
  url: string;
  apiKey?: string;
  apiHash?: string;
  bucketId?: string;
  store?: string;
  metadata?: string;
  mimeType?: string;
  concurrency: number;
  chunkSize: number;
  tmpDir?: string;
  cleanTmp: boolean;
  help?: boolean;
  version?: boolean;
  verbose?: boolean;

  // Custom Input Column mappings
  keyCol?: string;
  dataCol?: string;
  metaCol?: string;
  nameCol?: string;
  mimeCol?: string;

  // Custom Output Header mappings
  outputKeyHeader: string;
  outputUrlHeader: string;
  onlyCols: boolean; // Output ONLY the specified key and url columns
  includeStatus: boolean; // Include success, fileId, error columns
}

export interface CsvRow {
  rowIndex: number;
  key: string;
  data: string;
  metadata?: string;
  name?: string;
  mimeType?: string;
  extraFields?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  success: boolean;
  url?: string;
  fileId?: string;
  error?: string;
  rawResponse?: any;
  durationMs?: number;
}

export interface ImportSummary {
  totalRows: number;
  succeeded: number;
  failed: number;
  elapsedMs: number;
  outputFile: string;
}

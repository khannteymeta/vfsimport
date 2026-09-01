export interface CliOptions {
  input: string;
  output: string;
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
}

export interface CsvRow {
  rowIndex: number;
  key: string;
  data: string;
  metadata?: string;
  name?: string;
  mimeType?: string;
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

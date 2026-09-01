import type { CsvRow, CliOptions } from "./types";

/**
 * A streaming CSV parser state machine that handles large CSV files safely without memory overflow.
 * Properly skips and parses header rows without uploading them.
 */
export async function* parseCsvStream(
  filePath: string,
  options?: Partial<CliOptions>
): AsyncGenerator<CsvRow, void, unknown> {
  const file = Bun.file(filePath);
  const exists = await file.exists();
  if (!exists) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const hasHeader = options?.hasHeader !== false; // default: true
  const stream = file.stream();
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");

  let inQuotes = false;
  let currentField = "";
  let currentRow: string[] = [];
  let isFirstRow = true;
  let headers: string[] | null = null;
  let keyIndex = options?.keyCol && !isNaN(Number(options.keyCol)) ? Number(options.keyCol) : 0;
  let dataIndex = options?.dataCol && !isNaN(Number(options.dataCol)) ? Number(options.dataCol) : 1;
  let metaIndex = options?.metaCol && !isNaN(Number(options.metaCol)) ? Number(options.metaCol) : -1;
  let nameIndex = options?.nameCol && !isNaN(Number(options.nameCol)) ? Number(options.nameCol) : -1;
  let mimeIndex = options?.mimeCol && !isNaN(Number(options.mimeCol)) ? Number(options.mimeCol) : -1;
  let rowIndex = 0;

  const resolveColumnIndex = (
    headerList: string[],
    specifiedCol?: string,
    fallbackNames: string[] = [],
    defaultIdx: number = 0
  ): number => {
    if (specifiedCol) {
      if (!isNaN(Number(specifiedCol))) {
        return Number(specifiedCol);
      }
      const lowerSpecified = specifiedCol.trim().toLowerCase();
      const foundIdx = headerList.findIndex((h) => h === lowerSpecified);
      if (foundIdx >= 0) return foundIdx;
    }

    for (const name of fallbackNames) {
      const idx = headerList.findIndex((h) => h === name.toLowerCase());
      if (idx >= 0) return idx;
    }

    return defaultIdx;
  };

  const processRow = (rowFields: string[]): CsvRow | null => {
    if (rowFields.length === 0 || (rowFields.length === 1 && rowFields[0].trim() === "")) {
      return null;
    }

    if (isFirstRow && hasHeader) {
      isFirstRow = false;
      headers = rowFields.map((c) => c.trim().toLowerCase());

      keyIndex = resolveColumnIndex(
        headers,
        options?.keyCol,
        ["key", "id", "uuid", "code", "name", "user_id", "product_id", "title"],
        0
      );
      dataIndex = resolveColumnIndex(
        headers,
        options?.dataCol,
        ["data", "base64", "file", "content", "image", "photo", "pic", "avatar", "attachment", "raw"],
        1
      );
      metaIndex = resolveColumnIndex(
        headers,
        options?.metaCol,
        ["metadata", "meta"],
        -1
      );
      nameIndex = resolveColumnIndex(
        headers,
        options?.nameCol,
        ["filename", "file_name"],
        -1
      );
      mimeIndex = resolveColumnIndex(
        headers,
        options?.mimeCol,
        ["mimetype", "mime_type", "mime", "content_type"],
        -1
      );

      // Header row is parsed for column indices and IGNORED from uploading
      return null;
    }

    isFirstRow = false;

    const key = (rowFields[keyIndex] ?? "").trim();
    const data = (rowFields[dataIndex] ?? "").trim();

    if (!key && !data) {
      return null;
    }

    rowIndex++;
    return {
      rowIndex,
      key: key || `row_${rowIndex}`,
      data,
      metadata: metaIndex >= 0 ? rowFields[metaIndex] : undefined,
      name: nameIndex >= 0 ? rowFields[nameIndex] : undefined,
      mimeType: mimeIndex >= 0 ? rowFields[mimeIndex] : undefined,
    };
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const len = chunk.length;

      for (let i = 0; i < len; i++) {
        const char = chunk[i];

        if (char === '"') {
          if (inQuotes && i + 1 < len && chunk[i + 1] === '"') {
            // Escaped quote: ""
            currentField += '"';
            i++; // skip next quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          currentRow.push(currentField);
          currentField = "";
        } else if ((char === "\r" || char === "\n") && !inQuotes) {
          if (char === "\r" && i + 1 < len && chunk[i + 1] === "\n") {
            i++; // skip \n in \r\n
          }

          currentRow.push(currentField);
          currentField = "";

          const parsed = processRow(currentRow);
          if (parsed) {
            yield parsed;
          }
          currentRow = [];
        } else {
          currentField += char;
        }
      }
    }

    // Flush any remaining field at end of stream
    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField);
      const parsed = processRow(currentRow);
      if (parsed) {
        yield parsed;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

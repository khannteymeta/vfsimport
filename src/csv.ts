import type { CsvRow } from "./types";

/**
 * A streaming CSV parser state machine that handles large CSV files safely without memory overflow.
 * Supports:
 * - RFC 4180 quotes with escaped quotes `""`
 * - Newlines within quoted fields
 * - Header detection (key/data/metadata/name/mime)
 * - Fallback to column index 0 = key, 1 = data
 */
export async function* parseCsvStream(filePath: string): AsyncGenerator<CsvRow, void, unknown> {
  const file = Bun.file(filePath);
  const exists = await file.exists();
  if (!exists) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const stream = file.stream();
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");

  let inQuotes = false;
  let currentField = "";
  let currentRow: string[] = [];
  let isFirstRow = true;
  let headers: string[] | null = null;
  let keyIndex = 0;
  let dataIndex = 1;
  let metaIndex = -1;
  let nameIndex = -1;
  let mimeIndex = -1;
  let rowIndex = 0;

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

          // Process the completed row if it's not completely empty
          if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim() !== "")) {
            if (isFirstRow) {
              isFirstRow = false;
              const lowerCols = currentRow.map((c) => c.trim().toLowerCase());
              const hasKey = lowerCols.includes("key") || lowerCols.includes("id") || lowerCols.includes("name");
              const hasData =
                lowerCols.includes("data") ||
                lowerCols.includes("base64") ||
                lowerCols.includes("file") ||
                lowerCols.includes("content");

              if (hasKey && hasData) {
                // Header detected
                headers = lowerCols;
                keyIndex = headers.findIndex((h) => h === "key" || h === "id" || h === "name");
                dataIndex = headers.findIndex(
                  (h) => h === "data" || h === "base64" || h === "file" || h === "content"
                );
                metaIndex = headers.findIndex((h) => h === "metadata" || h === "meta");
                nameIndex = headers.findIndex((h) => h === "filename" || h === "name" && h !== headers[keyIndex]);
                mimeIndex = headers.findIndex((h) => h === "mimetype" || h === "mime_type" || h === "mime");
                currentRow = [];
                continue;
              } else {
                // First row is actually data, fallback to index 0 and 1
                keyIndex = 0;
                dataIndex = 1;
              }
            }

            const key = (currentRow[keyIndex] ?? "").trim();
            const data = (currentRow[dataIndex] ?? "").trim();

            if (key || data) {
              rowIndex++;
              yield {
                rowIndex,
                key: key || `row_${rowIndex}`,
                data,
                metadata: metaIndex >= 0 ? currentRow[metaIndex] : undefined,
                name: nameIndex >= 0 ? currentRow[nameIndex] : undefined,
                mimeType: mimeIndex >= 0 ? currentRow[mimeIndex] : undefined,
              };
            }
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
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim() !== "")) {
        if (!isFirstRow || (currentRow[keyIndex] && currentRow[dataIndex])) {
          rowIndex++;
          yield {
            rowIndex,
            key: (currentRow[keyIndex] ?? "").trim() || `row_${rowIndex}`,
            data: (currentRow[dataIndex] ?? "").trim(),
            metadata: metaIndex >= 0 ? currentRow[metaIndex] : undefined,
            name: nameIndex >= 0 ? currentRow[nameIndex] : undefined,
            mimeType: mimeIndex >= 0 ? currentRow[mimeIndex] : undefined,
          };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

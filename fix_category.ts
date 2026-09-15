#!/usr/bin/env bun
import * as XLSX from "xlsx";
import { parseArgs } from "util";
import { existsSync } from "fs";

/**
 * Script to fix/replace Category values in a target Excel file
 * using a reference Excel file matching by product/item Name.
 */

function printHelp() {
  console.log(`
Usage:
  bun run fix_category.ts [options]

Options:
  -t, --target <path>       Path to Excel file with incorrect Category (required)
  -r, --reference <path>    Path to Excel file with correct Name & Category (required)
  -o, --output <path>       Output Excel file path (default: "fixed_output.xlsx")
  --name-col <name>         Name column header to match on (default: auto-detected or "Name")
  --cat-col <name>          Category column header to update (default: auto-detected or "Category")
  -h, --help                Show this help message

Example:
  bun run fix_category.ts -t "items_wrong_cat.xlsx" -r "reference_categories.xlsx" -o "items_fixed.xlsx"
  bun run fix_category.ts -t "file1.xlsx" -r "file2.xlsx" --name-col "Product Name" --cat-col "Category"
`);
}

function normalizeKey(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str).trim().toLowerCase();
}

function findMatchingKey(obj: Record<string, any>, candidates: string[]): string | undefined {
  const keys = Object.keys(obj);
  for (const candidate of candidates) {
    const found = keys.find(k => k.trim().toLowerCase() === candidate.toLowerCase());
    if (found) return found;
  }
  return undefined;
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      target: { type: "string", short: "t" },
      reference: { type: "string", short: "r" },
      output: { type: "string", short: "o", default: "fixed_output.xlsx" },
      "name-col": { type: "string" },
      "cat-col": { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  if (!values.target || !values.reference) {
    console.error("❌ Error: Both --target (-t) and --reference (-r) files are required.\n");
    printHelp();
    process.exit(1);
  }

  if (!existsSync(values.target)) {
    console.error(`❌ Error: Target file not found: ${values.target}`);
    process.exit(1);
  }

  if (!existsSync(values.reference)) {
    console.error(`❌ Error: Reference file not found: ${values.reference}`);
    process.exit(1);
  }

  console.log("══════════════════════════════════════════════════════════════");
  console.log(" 📊 Excel Category Fixer");
  console.log("══════════════════════════════════════════════════════════════");
  console.log(` 🎯 Target File     : ${values.target}`);
  console.log(` 📖 Reference File  : ${values.reference}`);
  console.log(` 💾 Output File     : ${values.output}`);
  console.log("══════════════════════════════════════════════════════════════\n");

  // Helper to find first non-empty sheet
  function getFirstNonEmptySheetData(workbook: XLSX.WorkBook): { sheetName: string; data: Record<string, any>[] } {
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const data: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (data.length > 0) {
        return { sheetName, data };
      }
    }
    return { sheetName: workbook.SheetNames[0] || "Sheet1", data: [] };
  }

  // 1. Read Reference Workbook
  console.log("⏳ Reading reference file...");
  const refWorkbook = XLSX.readFile(values.reference);
  const { sheetName: refSheetName, data: refData } = getFirstNonEmptySheetData(refWorkbook);

  if (refData.length === 0) {
    console.error(`❌ Reference file is empty (checked sheets: ${refWorkbook.SheetNames.join(", ")}).`);
    process.exit(1);
  }

  console.log(`  -> Using sheet "${refSheetName}" from reference file.`);

  const sampleRef = refData[0];
  const refNameCol = values["name-col"] || findMatchingKey(sampleRef, ["name", "product name", "item name", "title", "product_name", "item_name"]);
  const refCatCol = values["cat-col"] || findMatchingKey(sampleRef, ["category", "category name", "category_name", "cat", "item category"]);

  if (!refNameCol || !refCatCol) {
    console.error(`❌ Could not auto-detect columns in reference file.`);
    console.error(`Available headers: ${Object.keys(sampleRef).join(", ")}`);
    console.error(`Please specify --name-col and --cat-col options.`);
    process.exit(1);
  }

  console.log(`  -> Using Reference columns: [Name: "${refNameCol}"] | [Category: "${refCatCol}"]`);

  // Build mapping lookup
  const categoryMap = new Map<string, string>();
  for (const row of refData) {
    const rawName = row[refNameCol];
    const rawCat = row[refCatCol];
    if (rawName && rawCat) {
      categoryMap.set(normalizeKey(rawName), String(rawCat).trim());
    }
  }
  console.log(`  -> Loaded ${categoryMap.size} category mappings from reference file.\n`);

  // 2. Read Target Workbook
  console.log("⏳ Reading target file...");
  const targetWorkbook = XLSX.readFile(values.target);
  const { sheetName: targetSheetName, data: targetData } = getFirstNonEmptySheetData(targetWorkbook);

  if (targetData.length === 0) {
    console.error(`❌ Target file is empty (checked sheets: ${targetWorkbook.SheetNames.join(", ")}).`);
    process.exit(1);
  }

  console.log(`  -> Using sheet "${targetSheetName}" from target file.`);

  const sampleTarget = targetData[0];
  const targetNameCol = values["name-col"] || findMatchingKey(sampleTarget, ["name", "product name", "item name", "title", "product_name", "item_name"]);
  const targetCatCol = values["cat-col"] || findMatchingKey(sampleTarget, ["category", "category name", "category_name", "cat", "item category"]);

  if (!targetNameCol || !targetCatCol) {
    console.error(`❌ Could not auto-detect columns in target file.`);
    console.error(`Available headers: ${Object.keys(sampleTarget).join(", ")}`);
    console.error(`Please specify --name-col and --cat-col options.`);
    process.exit(1);
  }

  console.log(`  -> Using Target columns: [Name: "${targetNameCol}"] | [Category: "${targetCatCol}"]`);

  // 3. Update Target rows
  let replacedCount = 0;
  let notFoundCount = 0;

  const updatedData = targetData.map((row) => {
    const rowName = row[targetNameCol];
    const normName = normalizeKey(rowName);
    const updatedRow = { ...row };

    if (categoryMap.has(normName)) {
      const newCategory = categoryMap.get(normName)!;
      if (updatedRow[targetCatCol] !== newCategory) {
        updatedRow[targetCatCol] = newCategory;
        replacedCount++;
      }
    } else {
      notFoundCount++;
    }
    return updatedRow;
  });

  // 4. Save to output Excel file
  console.log("\n⏳ Saving updated Excel file...");
  const newSheet = XLSX.utils.json_to_sheet(updatedData);
  const newWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newWorkbook, newSheet, targetSheetName || "Sheet1");
  XLSX.writeFile(newWorkbook, values.output);

  console.log("\n==============================================================");
  console.log(" 🎉 Excel Category Replacement Completed!");
  console.log("==============================================================");
  console.log(` 📊 Total Rows in Target  : ${targetData.length}`);
  console.log(` 🔄 Categories Updated   : ${replacedCount}`);
  console.log(` ⚠️ Unmatched Names      : ${notFoundCount}`);
  console.log(` 📁 Saved to             : ${values.output}`);
  console.log("==============================================================\n");
}

main().catch((err) => {
  console.error("❌ Execution error:", err);
  process.exit(1);
});

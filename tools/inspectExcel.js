#!/usr/bin/env node
/** Quick dump of the SGL stats workbook so we can see sheet structure. */
const path = require("path");
const ExcelJS = require("exceljs");

const FILE = path.join(__dirname, "..", "SGL Player Stats 2025–2026.xlsx");

function cellVal(c) {
  const v = c.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if (v.richText) return v.richText.map((r) => r.text).join("");
    if (v.text) return v.text;
    if (v.result !== undefined) return v.result;
    if (v instanceof Date) return v.toISOString();
    return JSON.stringify(v);
  }
  return v;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);

  console.log("SHEETS:", wb.worksheets.map((w) => `${w.name} (${w.rowCount}r x ${w.columnCount}c)`).join(" | "));

  for (const name of ["Standings"]) {
    const ws = wb.getWorksheet(name);
    if (!ws) {
      console.log(`\n!! sheet "${name}" not found`);
      continue;
    }
    console.log(`\n===== ${name} (${ws.rowCount} rows x ${ws.columnCount} cols) =====`);
    const maxRows = Math.min(ws.rowCount, 500);
    for (let r = 1; r <= maxRows; r++) {
      const row = ws.getRow(r);
      const vals = [];
      for (let c = 1; c <= ws.columnCount; c++) {
        vals.push(String(cellVal(row.getCell(c))).replace(/\n/g, "\\n"));
      }
      // trim trailing empties
      while (vals.length && vals[vals.length - 1] === "") vals.pop();
      if (vals.length) console.log(`r${r}: ${vals.join(" || ")}`);
    }
    if (ws.rowCount > maxRows) console.log(`... (${ws.rowCount - maxRows} more rows)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

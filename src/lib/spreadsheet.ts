/**
 * Excel in and out, in the browser.
 *
 * ExcelJS is ~1MB, so it is imported dynamically: a lab that never touches a
 * spreadsheet never downloads the parser.
 */

/** Build an .xlsx file with a header row and auto-sized columns. */
export async function toXlsxBlob(
  sheetName: string,
  headers: string[],
  rows: (string | number)[][]
): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const book = new ExcelJS.Workbook();
  book.created = new Date();
  // Excel refuses sheet names over 31 chars or containing []*/\?:
  const sheet = book.addWorksheet(sheetName.replace(/[[\]*/\\?:]/g, "").slice(0, 31) || "Export");

  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));
  sheet.columns.forEach((column, i) => {
    const longest = Math.max(
      headers[i]?.length ?? 0,
      ...rows.map((r) => String(r[i] ?? "").length)
    );
    column.width = Math.min(Math.max(longest + 2, 10), 40);
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await book.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** Read the first sheet of an .xlsx into header-keyed rows, like Papa.parse does for CSV. */
export async function readXlsx(file: File): Promise<Record<string, string>[]> {
  const ExcelJS = (await import("exceljs")).default;
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await file.arrayBuffer());
  const sheet = book.worksheets[0];
  if (!sheet) return [];

  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell, col) => {
    headers[col - 1] = String(cell.text ?? "").trim();
  });

  const rows: Record<string, string>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: Record<string, string> = {};
    let empty = true;
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      const header = headers[col - 1];
      if (!header) return;
      // .text renders dates and formulas the way the user sees them, which is
      // what field validation expects.
      const value = String(cell.text ?? "").trim();
      if (value) empty = false;
      record[header] = value;
    });
    if (!empty) rows.push(record);
  });
  return rows;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

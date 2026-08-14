export function csvCell(value: string | number | bigint | null | undefined) {
  let text = value === null || value === undefined ? "" : String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function csvDocument(headers: string[], rows: Array<Array<string | number | bigint | null | undefined>>) {
  return [headers.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\r\n");
}

export function parseCsv(text: string, maxRows = 10_000) {
  if (text.includes("\0")) throw new Error("CSV contains invalid null bytes.");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
      continue;
    }
    if (character === '"' && field.length === 0) quoted = true;
    else if (character === ",") { row.push(field); field = ""; }
    else if (character === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; if (rows.length > maxRows + 1) throw new Error(`CSV exceeds ${maxRows} data rows.`); }
    else field += character;
  }
  if (quoted) throw new Error("CSV has an unterminated quoted field.");
  if (field.length || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

export function csvRecords(text: string, requiredHeaders: string[], maxRows = 10_000) {
  const rows = parseCsv(text.replace(/^\uFEFF/, ""), maxRows);
  if (!rows.length) throw new Error("CSV is empty.");
  const headers = rows[0].map((header) => header.trim().toLowerCase().replaceAll(" ", "_"));
  for (const required of requiredHeaders) if (!headers.includes(required)) throw new Error(`CSV is missing the ${required} column.`);
  return rows.slice(1).map((cells, index) => ({ rowNumber: index + 2, values: Object.fromEntries(headers.map((header, column) => [header, cells[column]?.trim() ?? ""])) }));
}

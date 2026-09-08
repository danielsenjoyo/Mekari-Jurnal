// CSV download, for the Products module's import templates and exports.
//
// The source hands both off to the backend: a template is a static asset behind
// a signed URL, and an export is a background job that mails a link. Neither
// exists here, and a prototype that answers "Download template" with nothing is
// a dead control — the one thing the screen is meant to demonstrate.
//
// So the file is built in the browser from the data already in memory. It costs
// a Blob and an anchor click, and it makes both flows real end to end.

/**
 * Wrap one cell so a comma, a quote or a newline inside it can't split the row.
 *
 * Excel's rules, not a general escaper: double the quotes, then wrap the whole
 * field. Applied to every field rather than only the ones that need it, because
 * a leading zero (a product code like `0041`) survives quoting and is eaten
 * without it.
 */
function csvField(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function toCsv(header: string[], rows: (string | number)[][]): string {
  const lines = [header, ...rows].map((row) => row.map(csvField).join(","));
  // A UTF-8 BOM: without it Excel on Windows reads "Persediaan" as mojibake.
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

/**
 * Hand the browser a file to save.
 *
 * The object URL is revoked on the next frame rather than immediately —
 * revoking it in the same tick can beat the download the click just started.
 */
export function downloadCsv(fileName: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}

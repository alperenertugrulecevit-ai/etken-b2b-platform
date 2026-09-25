"use client";

export default function ExcelTableExportButton({ tableId, fileName }: { tableId: string; fileName: string }) {
  function download() {
    const table = document.getElementById(tableId) as HTMLTableElement | null;
    if (!table) return;
    const lines = Array.from(table.rows).map((row) =>
      Array.from(row.cells)
        .map((cell) => {
          const value = (cell.textContent ?? "").trim().replace(/"/g, '""');
          return '"' + value + '"';
        })
        .join(";")
    );
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  return <button type="button" onClick={download} className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-600">Excel İndir</button>;
}

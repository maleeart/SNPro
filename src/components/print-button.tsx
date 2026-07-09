"use client";
export function PrintButton() {
  return (
    <button onClick={() => window.print()}
      className="print:hidden h-9 px-4 rounded-md border text-sm hover:bg-muted">
      🖨️ พิมพ์รายงาน
    </button>
  );
}

"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-blue-900 px-6 py-3 font-bold text-white hover:bg-blue-800"
    >
      🖨️ Yazdır / PDF Kaydet
    </button>
  );
}
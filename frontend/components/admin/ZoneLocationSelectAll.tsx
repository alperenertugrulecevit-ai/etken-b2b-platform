"use client";

export default function ZoneLocationSelectAll() {
  return <input type="checkbox" aria-label="Görünen lokasyonların tümünü seç" onChange={(event) => {
    document.querySelectorAll<HTMLInputElement>('input[name="locationId"]').forEach((box) => { box.checked = event.currentTarget.checked; });
  }} />;
}

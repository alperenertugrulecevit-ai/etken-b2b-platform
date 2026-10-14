#!/usr/bin/env python3
"""Validate a supplier-provided Zırhlı CSV snapshot offline. Never writes to production."""
import argparse
import csv
import decimal
import pathlib
import sys
from collections import Counter

D = decimal.Decimal
EXPECTED = {"kategori", "alt_kategori", "urun_adi", "birim",
            "kaynak_fiyat_tl", "etken_fiyat_tl", "gecici_anahtar", "gorulme_zamani"}

def money(value: str) -> decimal.Decimal:
    return D(value.strip().replace(",", ".")).quantize(D("0.01"), rounding=decimal.ROUND_HALF_UP)

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("csv_path", type=pathlib.Path)
    args = parser.parse_args()
    with args.csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        missing = EXPECTED - set(reader.fieldnames or [])
        if missing:
            print("Missing columns:", sorted(missing), file=sys.stderr)
            return 2
        rows = list(reader)
    errors = []
    keys = set()
    units = Counter()
    categories = Counter()
    for i, row in enumerate(rows, 2):
        key = (row.get("gecici_anahtar") or "").strip()
        if not key or key in keys:
            errors.append(f"line {i}: empty or duplicate temporary key")
        keys.add(key)
        for field in ("kategori", "alt_kategori", "urun_adi", "birim"):
            if not (row.get(field) or "").strip():
                errors.append(f"line {i}: missing {field}")
        try:
            source = money(row["kaynak_fiyat_tl"])
            target = money(row["etken_fiyat_tl"])
            expected = (source * D("1.20")).quantize(D("0.01"), rounding=decimal.ROUND_HALF_UP)
            if source <= 0 or target != expected:
                errors.append(f"line {i}: price mismatch or nonpositive source price")
        except (decimal.InvalidOperation, KeyError, AttributeError):
            errors.append(f"line {i}: invalid price")
        units[(row.get("birim") or "").strip()] += 1
        categories[(row.get("kategori") or "").strip()] += 1
    if len(rows) != 161:
        errors.append(f"expected 161 rows; got {len(rows)}")
    print(f"Rows: {len(rows)}; unique temporary keys: {len(keys)}")
    print("Categories:", dict(sorted(categories.items())))
    print("Units:", dict(sorted(units.items())))
    print("Validation:", "PASS" if not errors else "FAIL")
    for error in errors[:50]:
        print(" -", error)
    if errors:
        return 1
    print("NOTE: CSV lacks verified supplier SKU, manufacturer barcode, VAT basis, stock, and image rights.")
    print("NOTE: Passing validation does NOT authorize import or automatic activation.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())

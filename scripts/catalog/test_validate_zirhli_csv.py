#!/usr/bin/env python3
"""Offline regression tests for the Zırhlı CSV validator (no production access)."""
import csv
import pathlib
import subprocess
import sys
import tempfile
import unittest

SCRIPT = pathlib.Path(__file__).with_name("validate-zirhli-csv.py")
FIELDS = [
    "kategori", "alt_kategori", "urun_adi", "birim",
    "kaynak_fiyat_tl", "etken_fiyat_tl", "gecici_anahtar", "gorulme_zamani",
]


def rows():
    return [
        dict(zip(FIELDS, [
            "Hijyen", "Kağıt", f"Ürün {i}", "Paket", "10.00",
            "12.00", f"temporary-{i}", "2026-10-14",
        ]))
        for i in range(161)
    ]


def validate(data):
    with tempfile.TemporaryDirectory() as directory:
        path = pathlib.Path(directory) / "catalog.csv"
        with path.open("w", encoding="utf-8-sig", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=FIELDS, delimiter=";")
            writer.writeheader()
            writer.writerows(data)
        return subprocess.run(
            [sys.executable, str(SCRIPT), str(path)],
            capture_output=True, text=True, check=False,
        )


class ZirhliCsvValidationTests(unittest.TestCase):
    def test_valid_161_rows(self):
        result = validate(rows())
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_duplicate_temporary_key_is_rejected(self):
        data = rows()
        data[1]["gecici_anahtar"] = data[0]["gecici_anahtar"]
        self.assertNotEqual(validate(data).returncode, 0)

    def test_duplicate_name_and_sale_unit_is_rejected(self):
        data = rows()
        data[1]["urun_adi"] = data[0]["urun_adi"]
        self.assertNotEqual(validate(data).returncode, 0)

    def test_incorrect_markup_is_rejected(self):
        data = rows()
        data[0]["etken_fiyat_tl"] = "11.99"
        self.assertNotEqual(validate(data).returncode, 0)

    def test_nonfinite_price_is_rejected(self):
        for invalid in ("NaN", "Infinity", "-Infinity"):
            with self.subTest(invalid=invalid):
                data = rows()
                data[0]["kaynak_fiyat_tl"] = invalid
                self.assertNotEqual(validate(data).returncode, 0)

    def test_missing_row_is_rejected(self):
        self.assertNotEqual(validate(rows()[:-1]).returncode, 0)


if __name__ == "__main__":
    unittest.main()

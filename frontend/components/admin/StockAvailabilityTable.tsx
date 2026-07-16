"use client";

import Link from "next/link";

import {
  useMemo,
  useState,
} from "react";

export type StockAvailabilityRow = {
  itemId: number;

  warehouseId: number | null;
  warehouseCode: string;
  warehouseName: string;

  locationId: number | null;
  locationCode: string;

  handlingUnitId: number;
  handlingUnitBarcode: string;
  handlingUnitType: string;
  handlingUnitPurpose: string;
  handlingUnitStatus: string;

  assignedOrderNumber: string;
  assignedCustomerName: string;

  productId: number;
  productCode: string;
  productBarcode: string;
  productName: string;

  locationStock: number;
  plannableStock: number;
  blockedStock: number;
  reservedStock: number;
  availableStock: number;

  stockClass: "PLANNABLE" | "BLOCKED";
  blockReason: string;
};

type Props = {
  rows: StockAvailabilityRow[];
};

function formatNumber(
  value: number
) {
  return value.toLocaleString(
    "tr-TR"
  );
}

function getPurposeLabel(
  purpose: string
) {
  const labels: Record<string, string> = {
    STOCK: "Stok",
    PICKING: "Toplama",
    PACKING: "Paketleme",
    SHIPPING: "Sevkiyat",
    RECEIVING: "Mal Kabul",
  };

  return labels[purpose] ?? purpose;
}

function getStatusLabel(
  status: string
) {
  const labels: Record<string, string> = {
    OPEN: "Açık",
    CLOSED: "Kapalı",
    STORED: "Adreslendi",
    IN_TRANSIT: "Transferde",
    EMPTY: "Boş",
    CANCELLED: "İptal",
  };

  return labels[status] ?? status;
}

export default function StockAvailabilityTable({
  rows,
}: Props) {
  const [
    search,
    setSearch,
  ] = useState("");

  const [
    warehouseFilter,
    setWarehouseFilter,
  ] = useState("");

  const [
    locationFilter,
    setLocationFilter,
  ] = useState("");

  const [
    stockClassFilter,
    setStockClassFilter,
  ] = useState("");

  const [
    onlyReserved,
    setOnlyReserved,
  ] = useState(false);

  const [
    selectedRow,
    setSelectedRow,
  ] =
    useState<StockAvailabilityRow | null>(
      null
    );

  const warehouses = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map(
              (row) =>
                row.warehouseCode
            )
            .filter(Boolean)
        )
      ).sort((a, b) =>
        a.localeCompare(b, "tr")
      ),
    [rows]
  );

  const locations = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .filter(
              (row) =>
                !warehouseFilter ||
                row.warehouseCode ===
                  warehouseFilter
            )
            .map(
              (row) =>
                row.locationCode
            )
            .filter(Boolean)
        )
      ).sort((a, b) =>
        a.localeCompare(b, "tr")
      ),
    [rows, warehouseFilter]
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch =
      search
        .trim()
        .toLocaleUpperCase(
          "tr-TR"
        );

    return rows.filter((row) => {
      if (
        warehouseFilter &&
        row.warehouseCode !==
          warehouseFilter
      ) {
        return false;
      }

      if (
        locationFilter &&
        row.locationCode !==
          locationFilter
      ) {
        return false;
      }

      if (
        stockClassFilter &&
        row.stockClass !==
          stockClassFilter
      ) {
        return false;
      }

      if (
        onlyReserved &&
        row.reservedStock <= 0
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchText = [
        row.warehouseCode,
        row.warehouseName,
        row.locationCode,
        row.handlingUnitBarcode,
        row.productCode,
        row.productBarcode,
        row.productName,
        row.assignedOrderNumber,
        row.assignedCustomerName,
      ]
        .join(" ")
        .toLocaleUpperCase(
          "tr-TR"
        );

      return searchText.includes(
        normalizedSearch
      );
    });
  }, [
    rows,
    search,
    warehouseFilter,
    locationFilter,
    stockClassFilter,
    onlyReserved,
  ]);

  const totals = useMemo(
    () =>
      filteredRows.reduce(
        (total, row) => ({
          locationStock:
            total.locationStock +
            row.locationStock,

          plannableStock:
            total.plannableStock +
            row.plannableStock,

          blockedStock:
            total.blockedStock +
            row.blockedStock,

          reservedStock:
            total.reservedStock +
            row.reservedStock,

          availableStock:
            total.availableStock +
            row.availableStock,
        }),
        {
          locationStock: 0,
          plannableStock: 0,
          blockedStock: 0,
          reservedStock: 0,
          availableStock: 0,
        }
      ),
    [filteredRows]
  );

  function clearFilters() {
    setSearch("");
    setWarehouseFilter("");
    setLocationFilter("");
    setStockClassFilter("");
    setOnlyReserved(false);
  }

  return (
    <>
      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="grid gap-4 lg:grid-cols-5">
          <label className="lg:col-span-2">
            <span className="mb-2 block text-sm font-semibold">
              Arama
            </span>

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Ürün, barkod, THM veya sipariş ara"
              className="w-full rounded-xl border border-slate-300 p-4"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Depo
            </span>

            <select
              value={warehouseFilter}
              onChange={(event) => {
                setWarehouseFilter(
                  event.target.value
                );

                setLocationFilter("");
              }}
              className="w-full rounded-xl border border-slate-300 bg-white p-4"
            >
              <option value="">
                Tüm depolar
              </option>

              {warehouses.map(
                (warehouse) => (
                  <option
                    key={warehouse}
                    value={warehouse}
                  >
                    {warehouse}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Lokasyon
            </span>

            <select
              value={locationFilter}
              onChange={(event) =>
                setLocationFilter(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white p-4"
            >
              <option value="">
                Tüm lokasyonlar
              </option>

              {locations.map(
                (location) => (
                  <option
                    key={location}
                    value={location}
                  >
                    {location}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Stok Sınıfı
            </span>

            <select
              value={
                stockClassFilter
              }
              onChange={(event) =>
                setStockClassFilter(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white p-4"
            >
              <option value="">
                Tüm stoklar
              </option>

              <option value="PLANNABLE">
                Planlanabilir
              </option>

              <option value="BLOCKED">
                Bloke
              </option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-3 rounded-xl bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800">
            <input
              type="checkbox"
              checked={onlyReserved}
              onChange={(event) =>
                setOnlyReserved(
                  event.target.checked
                )
              }
              className="h-5 w-5"
            />

            Yalnızca rezerve stokları göster
          </label>

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
          >
            Filtreleri Temizle
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-5">
        <article className="rounded-2xl bg-white p-5 shadow">
          <p className="text-xs font-bold uppercase text-slate-500">
            Lokasyon Stoğu
          </p>

          <p className="mt-3 text-3xl font-black text-slate-900">
            {formatNumber(
              totals.locationStock
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-green-50 p-5 shadow">
          <p className="text-xs font-bold uppercase text-green-700">
            Planlanabilir
          </p>

          <p className="mt-3 text-3xl font-black text-green-800">
            {formatNumber(
              totals.plannableStock
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-red-50 p-5 shadow">
          <p className="text-xs font-bold uppercase text-red-700">
            Bloke
          </p>

          <p className="mt-3 text-3xl font-black text-red-800">
            {formatNumber(
              totals.blockedStock
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-orange-50 p-5 shadow">
          <p className="text-xs font-bold uppercase text-orange-700">
            Rezerve
          </p>

          <p className="mt-3 text-3xl font-black text-orange-800">
            {formatNumber(
              totals.reservedStock
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-blue-50 p-5 shadow">
          <p className="text-xs font-bold uppercase text-blue-700">
            Kullanılabilir
          </p>

          <p className="mt-3 text-3xl font-black text-blue-800">
            {formatNumber(
              totals.availableStock
            )}
          </p>
        </article>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow">
        <table className="w-full min-w-[1550px] text-left">
          <thead className="bg-blue-950 text-white">
            <tr>
              <th className="p-4">
                Depo
              </th>

              <th className="p-4">
                Lokasyon
              </th>

              <th className="p-4">
                THM ID
              </th>

              <th className="p-4">
                Ürün Kodu
              </th>

              <th className="p-4">
                Ürün Tanımı
              </th>

              <th className="p-4 text-right">
                Lokasyon Stoğu
              </th>

              <th className="p-4 text-right">
                Planlanabilir Stok
              </th>

              <th className="p-4 text-right">
                Bloke Stok
              </th>

              <th className="p-4 text-right">
                Rezerve Stok
              </th>

              <th className="p-4 text-right">
                Kullanılabilir
              </th>

              <th className="p-4">
                Sınıf
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredRows.map(
              (row) => (
                <tr
                  key={row.itemId}
                  className="border-b hover:bg-slate-50"
                >
                  <td className="p-4 font-bold">
                    {row.warehouseCode ||
                      "-"}
                  </td>

                  <td className="p-4 font-mono font-semibold">
                    {row.locationCode ||
                      "-"}
                  </td>

                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedRow(
                          row
                        )
                      }
                      className="rounded-lg bg-slate-900 px-3 py-2 font-mono font-bold text-white hover:bg-slate-700"
                    >
                      {
                        row.handlingUnitBarcode
                      }
                    </button>
                  </td>

                  <td className="p-4 font-bold text-blue-900">
                    {row.productCode}
                  </td>

                  <td className="p-4">
                    {row.productName}
                  </td>

                  <td className="p-4 text-right text-lg font-bold">
                    {formatNumber(
                      row.locationStock
                    )}
                  </td>

                  <td className="bg-green-50 p-4 text-right text-lg font-bold text-green-800">
                    {formatNumber(
                      row.plannableStock
                    )}
                  </td>

                  <td className="bg-red-50 p-4 text-right text-lg font-bold text-red-800">
                    {formatNumber(
                      row.blockedStock
                    )}
                  </td>

                  <td className="bg-orange-50 p-4 text-right text-lg font-bold text-orange-800">
                    {formatNumber(
                      row.reservedStock
                    )}
                  </td>

                  <td className="bg-blue-50 p-4 text-right text-lg font-bold text-blue-800">
                    {formatNumber(
                      row.availableStock
                    )}
                  </td>

                  <td className="p-4">
                    <span
                      className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-bold ${
                        row.stockClass ===
                        "PLANNABLE"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {row.stockClass ===
                      "PLANNABLE"
                        ? "Planlanabilir"
                        : "Bloke"}
                    </span>

                    {row.blockReason && (
                      <p className="mt-2 max-w-64 text-xs leading-5 text-slate-500">
                        {row.blockReason}
                      </p>
                    )}
                  </td>
                </tr>
              )
            )}

            {filteredRows.length ===
              0 && (
              <tr>
                <td
                  colSpan={11}
                  className="p-12 text-center text-slate-500"
                >
                  Seçilen filtrelere uygun
                  stok kaydı bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-right text-sm text-slate-500">
        Gösterilen kayıt:{" "}
        {filteredRows.length}
      </p>

      {selectedRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() =>
            setSelectedRow(null)
          }
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-blue-700">
                  THM Detayı
                </p>

                <h2 className="mt-2 font-mono text-2xl font-black">
                  {
                    selectedRow.handlingUnitBarcode
                  }
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedRow(null)
                }
                className="rounded-xl bg-slate-100 px-4 py-2 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  THM Türü
                </p>

                <p className="mt-2 font-bold">
                  {
                    selectedRow.handlingUnitType
                  }
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Kullanım Amacı
                </p>

                <p className="mt-2 font-bold">
                  {getPurposeLabel(
                    selectedRow.handlingUnitPurpose
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Durum
                </p>

                <p className="mt-2 font-bold">
                  {getStatusLabel(
                    selectedRow.handlingUnitStatus
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Stok Sınıfı
                </p>

                <p
                  className={`mt-2 font-bold ${
                    selectedRow.stockClass ===
                    "PLANNABLE"
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  {selectedRow.stockClass ===
                  "PLANNABLE"
                    ? "Planlanabilir"
                    : "Bloke"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Depo
                </p>

                <p className="mt-2 font-bold">
                  {selectedRow.warehouseCode ||
                    "-"}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {
                    selectedRow.warehouseName
                  }
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Lokasyon
                </p>

                <p className="mt-2 font-mono font-bold">
                  {selectedRow.locationCode ||
                    "-"}
                </p>
              </div>
            </div>

            {selectedRow.assignedOrderNumber && (
              <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4 text-violet-900">
                <p className="text-xs font-bold uppercase">
                  Bağlı Sipariş
                </p>

                <p className="mt-2 font-mono text-xl font-black">
                  {
                    selectedRow.assignedOrderNumber
                  }
                </p>

                <p className="mt-1 font-semibold">
                  {
                    selectedRow.assignedCustomerName
                  }
                </p>
              </div>
            )}

            <div className="mt-4 rounded-xl border p-4">
              <p className="text-xs font-bold uppercase text-slate-500">
                Ürün
              </p>

              <p className="mt-2 font-bold text-blue-900">
                {selectedRow.productCode}
              </p>

              <p className="mt-1">
                {selectedRow.productName}
              </p>

              <p className="mt-2 font-mono text-sm text-slate-500">
                {
                  selectedRow.productBarcode
                }
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <div className="rounded-lg bg-slate-100 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase">
                    Toplam
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {
                      selectedRow.locationStock
                    }
                  </p>
                </div>

                <div className="rounded-lg bg-green-50 p-3 text-center text-green-800">
                  <p className="text-[10px] font-bold uppercase">
                    Planlanabilir
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {
                      selectedRow.plannableStock
                    }
                  </p>
                </div>

                <div className="rounded-lg bg-red-50 p-3 text-center text-red-800">
                  <p className="text-[10px] font-bold uppercase">
                    Bloke
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {
                      selectedRow.blockedStock
                    }
                  </p>
                </div>

                <div className="rounded-lg bg-orange-50 p-3 text-center text-orange-800">
                  <p className="text-[10px] font-bold uppercase">
                    Rezerve
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {
                      selectedRow.reservedStock
                    }
                  </p>
                </div>

                <div className="rounded-lg bg-blue-50 p-3 text-center text-blue-800">
                  <p className="text-[10px] font-bold uppercase">
                    Kullanılabilir
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {
                      selectedRow.availableStock
                    }
                  </p>
                </div>
              </div>
            </div>

            {selectedRow.blockReason && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
                <p className="font-bold">
                  Bloke Nedeni
                </p>

                <p className="mt-2 text-sm leading-6">
                  {
                    selectedRow.blockReason
                  }
                </p>
              </div>
            )}

            <Link
              href={`/admin/handling-units/${selectedRow.handlingUnitId}`}
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-blue-900 px-5 py-4 font-bold text-white hover:bg-blue-800"
            >
              THM Detay Sayfasını Aç
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
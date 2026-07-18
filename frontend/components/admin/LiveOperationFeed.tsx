"use client";

import { useMemo, useState } from "react";

type OperationFeedItem = {
  id: string;
  operationType: string;
  operationLabel: string;
  module: string;
  operatorName: string | null;
  terminalCode: string | null;
  barcode: string | null;
  sourceBarcode: string | null;
  targetBarcode: string | null;
  orderNumber: string | null;
  productCode: string | null;
  productName: string | null;
  quantity: number | null;
  description: string | null;
  isSuccessful: boolean;
  errorMessage: string | null;
  createdAt: string;
};

type LiveOperationFeedProps = {
  operations: OperationFeedItem[];
};

type FilterKey =
  | "ALL"
  | "PICKING"
  | "TRANSFER"
  | "ADDRESSING"
  | "RECEIVING"
  | "SHIPPING"
  | "FAILED";

const filters: Array<{
  key: FilterKey;
  label: string;
}> = [
  { key: "ALL", label: "Tümü" },
  { key: "PICKING", label: "Toplama" },
  { key: "TRANSFER", label: "Transfer" },
  { key: "ADDRESSING", label: "Adresleme" },
  { key: "RECEIVING", label: "Mal Kabul" },
  { key: "SHIPPING", label: "Sevkiyat" },
  { key: "FAILED", label: "Hatalı" },
];

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function getOperationClass(operationType: string) {
  const classes: Record<string, string> = {
    RECEIVING: "bg-emerald-100 text-emerald-800",
    ADDRESSING: "bg-blue-100 text-blue-800",
    UNADDRESSING: "bg-orange-100 text-orange-800",
    ITEM_TRANSFER: "bg-violet-100 text-violet-800",
    FULL_TRANSFER: "bg-purple-100 text-purple-800",
    PICKING: "bg-indigo-100 text-indigo-800",
    PACKING: "bg-cyan-100 text-cyan-800",
    SHIPPING: "bg-sky-100 text-sky-800",
    COUNT: "bg-amber-100 text-amber-800",
    PALLET_LINK: "bg-teal-100 text-teal-800",
    PALLET_UNLINK: "bg-rose-100 text-rose-800",
  };

  return (
    classes[operationType] ??
    "bg-slate-100 text-slate-700"
  );
}

function matchesFilter(
  operation: OperationFeedItem,
  filter: FilterKey
) {
  if (filter === "ALL") return true;
  if (filter === "FAILED") {
    return !operation.isSuccessful;
  }
  if (filter === "TRANSFER") {
    return [
      "ITEM_TRANSFER",
      "FULL_TRANSFER",
      "PALLET_LINK",
      "PALLET_UNLINK",
    ].includes(operation.operationType);
  }

  return operation.operationType === filter;
}

function getPrimaryReference(
  operation: OperationFeedItem
) {
  return (
    operation.barcode ||
    operation.targetBarcode ||
    operation.sourceBarcode ||
    operation.orderNumber ||
    operation.productCode ||
    "Referans yok"
  );
}

export default function LiveOperationFeed({
  operations,
}: LiveOperationFeedProps) {
  const [activeFilter, setActiveFilter] =
    useState<FilterKey>("ALL");

  const [operatorFilter, setOperatorFilter] =
    useState("");

  const [terminalFilter, setTerminalFilter] =
    useState("");

  const [selectedOperation, setSelectedOperation] =
    useState<OperationFeedItem | null>(null);

  const operatorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          operations
            .map((operation) => operation.operatorName)
            .filter(
              (value): value is string => Boolean(value)
            )
        )
      ).sort((a, b) =>
        a.localeCompare(b, "tr")
      ),
    [operations]
  );

  const terminalOptions = useMemo(
    () =>
      Array.from(
        new Set(
          operations
            .map((operation) => operation.terminalCode)
            .filter(
              (value): value is string => Boolean(value)
            )
        )
      ).sort((a, b) =>
        a.localeCompare(b, "tr")
      ),
    [operations]
  );

  const filteredOperations = useMemo(
    () =>
      operations.filter((operation) => {
        return (
          matchesFilter(operation, activeFilter) &&
          (!operatorFilter ||
            operation.operatorName === operatorFilter) &&
          (!terminalFilter ||
            operation.terminalCode === terminalFilter)
        );
      }),
    [
      operations,
      activeFilter,
      operatorFilter,
      terminalFilter,
    ]
  );

  const recentMinuteSummary = useMemo(() => {
    const now = Date.now();
    const recent = operations.filter(
      (operation) =>
        now - new Date(operation.createdAt).getTime() <=
        60 * 1000
    );

    return {
      picking: recent.filter(
        (operation) =>
          operation.operationType === "PICKING"
      ).length,
      transfer: recent.filter((operation) =>
        [
          "ITEM_TRANSFER",
          "FULL_TRANSFER",
          "PALLET_LINK",
          "PALLET_UNLINK",
        ].includes(operation.operationType)
      ).length,
      addressing: recent.filter(
        (operation) =>
          operation.operationType === "ADDRESSING"
      ).length,
      shipping: recent.filter(
        (operation) =>
          operation.operationType === "SHIPPING"
      ).length,
    };
  }, [operations]);

  return (
    <>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
                Anlık Hareketler
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                Canlı Operasyon Akışı
              </h2>

              <p className="mt-1 text-slate-500">
                Son WMS hareketlerini filtreleyin ve
                işlem ayrıntılarını inceleyin.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                {
                  label: "Toplama",
                  value: recentMinuteSummary.picking,
                },
                {
                  label: "Transfer",
                  value: recentMinuteSummary.transfer,
                },
                {
                  label: "Adresleme",
                  value: recentMinuteSummary.addressing,
                },
                {
                  label: "Sevkiyat",
                  value: recentMinuteSummary.shipping,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-center"
                >
                  <p className="text-[10px] font-bold uppercase text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xl font-black text-slate-950">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() =>
                  setActiveFilter(filter.key)
                }
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  activeFilter === filter.key
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <select
              value={operatorFilter}
              onChange={(event) =>
                setOperatorFilter(event.target.value)
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-500"
            >
              <option value="">
                Tüm operatörler
              </option>
              {operatorOptions.map((operator) => (
                <option
                  key={operator}
                  value={operator}
                >
                  {operator}
                </option>
              ))}
            </select>

            <select
              value={terminalFilter}
              onChange={(event) =>
                setTerminalFilter(event.target.value)
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-500"
            >
              <option value="">
                Tüm terminaller
              </option>
              {terminalOptions.map((terminal) => (
                <option
                  key={terminal}
                  value={terminal}
                >
                  {terminal}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="max-h-[760px] divide-y divide-slate-100 overflow-y-auto">
          {filteredOperations.map((operation) => (
            <button
              key={operation.id}
              type="button"
              onClick={() =>
                setSelectedOperation(operation)
              }
              className="flex w-full flex-wrap items-start justify-between gap-5 p-5 text-left transition hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${getOperationClass(
                      operation.operationType
                    )}`}
                  >
                    {operation.operationLabel}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      operation.isSuccessful
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {operation.isSuccessful
                      ? "Başarılı"
                      : "Başarısız"}
                  </span>
                </div>

                <p className="mt-3 truncate font-bold text-slate-950">
                  {operation.description ||
                    operation.productName ||
                    getPrimaryReference(operation)}
                </p>

                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
                  <span>
                    Operatör:{" "}
                    <strong className="text-slate-700">
                      {operation.operatorName ||
                        "Belirtilmedi"}
                    </strong>
                  </span>

                  <span>
                    RF:{" "}
                    <strong className="text-slate-700">
                      {operation.terminalCode ||
                        "Belirtilmedi"}
                    </strong>
                  </span>

                  <span>
                    Referans:{" "}
                    <strong className="font-mono text-slate-700">
                      {getPrimaryReference(operation)}
                    </strong>
                  </span>

                  {operation.quantity !== null && (
                    <span>
                      Miktar:{" "}
                      <strong className="text-slate-700">
                        {formatNumber(
                          operation.quantity
                        )}
                      </strong>
                    </span>
                  )}
                </div>

                {!operation.isSuccessful &&
                  operation.errorMessage && (
                    <p className="mt-2 text-sm font-semibold text-red-600">
                      {operation.errorMessage}
                    </p>
                  )}
              </div>

              <div className="whitespace-nowrap text-right">
                <p className="font-mono text-lg font-black text-slate-900">
                  {formatTime(operation.createdAt)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Ayrıntıyı aç
                </p>
              </div>
            </button>
          ))}

          {filteredOperations.length === 0 && (
            <div className="p-10 text-center text-slate-500">
              Seçilen filtrelerle eşleşen operasyon
              bulunmuyor.
            </div>
          )}
        </div>
      </section>

      {selectedOperation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={() =>
            setSelectedOperation(null)
          }
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
                  Operasyon Detayı
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">
                  {selectedOperation.operationLabel}
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedOperation(null)
                }
                className="rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-700 hover:bg-slate-200"
              >
                Kapat
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                ["Operasyon ID", selectedOperation.id],
                [
                  "Tarih ve Saat",
                  formatDateTime(
                    selectedOperation.createdAt
                  ),
                ],
                [
                  "Sonuç",
                  selectedOperation.isSuccessful
                    ? "Başarılı"
                    : "Başarısız",
                ],
                [
                  "Operatör",
                  selectedOperation.operatorName ||
                    "Belirtilmedi",
                ],
                [
                  "RF Terminal",
                  selectedOperation.terminalCode ||
                    "Belirtilmedi",
                ],
                [
                  "Modül",
                  selectedOperation.module,
                ],
                [
                  "Barkod",
                  selectedOperation.barcode ||
                    "Belirtilmedi",
                ],
                [
                  "Kaynak Barkod",
                  selectedOperation.sourceBarcode ||
                    "Belirtilmedi",
                ],
                [
                  "Hedef Barkod",
                  selectedOperation.targetBarcode ||
                    "Belirtilmedi",
                ],
                [
                  "Sipariş No",
                  selectedOperation.orderNumber ||
                    "Belirtilmedi",
                ],
                [
                  "Ürün Kodu",
                  selectedOperation.productCode ||
                    "Belirtilmedi",
                ],
                [
                  "Ürün",
                  selectedOperation.productName ||
                    "Belirtilmedi",
                ],
                [
                  "Miktar",
                  selectedOperation.quantity !== null
                    ? formatNumber(
                        selectedOperation.quantity
                      )
                    : "Belirtilmedi",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl bg-slate-50 p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {label}
                  </p>
                  <p className="mt-2 break-words font-semibold text-slate-950">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {selectedOperation.description && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Açıklama
                </p>
                <p className="mt-2 text-slate-800">
                  {selectedOperation.description}
                </p>
              </div>
            )}

            {selectedOperation.errorMessage && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                  Hata Mesajı
                </p>
                <p className="mt-2 font-semibold text-red-900">
                  {selectedOperation.errorMessage}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
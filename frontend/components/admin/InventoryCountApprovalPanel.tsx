"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  useFormStatus,
} from "react-dom";

import {
  approveInventoryCountAction,
} from "@/app/admin/inventory-counts/[id]/approval-actions";

export type InventoryCountApprovalLine = {
  id: number;
  locationCode: string;
  handlingUnitBarcode: string;
  handlingUnitType: string;
  productCode: string;
  productBarcode: string;
  productName: string;
  systemQuantity: number;
  countedQuantity: number | null;
  difference: number | null;
  countedByName: string;
  countedAt: string;
  note: string;
  isDiscovered: boolean;
  status: string;
  appliedQuantityChange:
    number | null;
};

type InventoryCountApprovalPanelProps = {
  inventoryCountId: number;
  countNumber: string;

  status:
    | "DRAFT"
    | "ACTIVE"
    | "IN_PROGRESS"
    | "SUBMITTED"
    | "APPROVED"
    | "CANCELLED";

  canApprove: boolean;

  lines:
    InventoryCountApprovalLine[];
};

function ApproveButton() {
  const {
    pending,
  } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-emerald-700 px-6 py-4 text-lg font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending
        ? "Sayım onaylanıyor ve stoklar güncelleniyor..."
        : "Sayımı Onayla ve Stoklara Uygula"}
    </button>
  );
}

function getDifferenceStyle(
  difference: number | null
) {
  if (
    difference === null
  ) {
    return "bg-slate-100 text-slate-600";
  }

  if (difference > 0) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (difference < 0) {
    return "bg-red-100 text-red-800";
  }

  return "bg-slate-100 text-slate-700";
}

function formatDifference(
  difference: number | null
) {
  if (
    difference === null
  ) {
    return "-";
  }

  if (difference > 0) {
    return `+${difference}`;
  }

  return String(difference);
}

export default function InventoryCountApprovalPanel({
  inventoryCountId,
  countNumber,
  status,
  canApprove,
  lines,
}: InventoryCountApprovalPanelProps) {
  const [
    showOnlyDifferences,
    setShowOnlyDifferences,
  ] = useState(false);

  const [
    searchValue,
    setSearchValue,
  ] = useState("");

  const approveAction =
    approveInventoryCountAction.bind(
      null,
      inventoryCountId
    );

  const normalizedSearchValue =
    searchValue
      .trim()
      .toLocaleUpperCase(
        "tr-TR"
      );

  const visibleLines =
    useMemo(
      () =>
        lines.filter(
          (line) => {
            if (
              showOnlyDifferences &&
              (
                line.difference ===
                  null ||
                line.difference ===
                  0
              )
            ) {
              return false;
            }

            if (
              !normalizedSearchValue
            ) {
              return true;
            }

            const searchText = [
              line.locationCode,
              line.handlingUnitBarcode,
              line.productCode,
              line.productBarcode,
              line.productName,
              line.countedByName,
            ]
              .join(" ")
              .toLocaleUpperCase(
                "tr-TR"
              );

            return searchText.includes(
              normalizedSearchValue
            );
          }
        ),
      [
        lines,
        normalizedSearchValue,
        showOnlyDifferences,
      ]
    );

  const differenceLineCount =
    lines.filter(
      (line) =>
        line.difference !==
          null &&
        line.difference !== 0
    ).length;

  const increaseTotal =
    lines.reduce(
      (
        total,
        line
      ) =>
        total +
        (
          line.difference &&
          line.difference > 0
            ? line.difference
            : 0
        ),
      0
    );

  const decreaseTotal =
    lines.reduce(
      (
        total,
        line
      ) =>
        total +
        (
          line.difference &&
          line.difference < 0
            ? Math.abs(
                line.difference
              )
            : 0
        ),
      0
    );

  const uncountedLineCount =
    lines.filter(
      (line) =>
        line.countedQuantity ===
        null
    ).length;

  const canSubmitApproval =
    status === "SUBMITTED" &&
    canApprove &&
    uncountedLineCount === 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-violet-700">
            Sayım Kontrolü
          </p>

          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Sayım Farkları
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Lokasyon, THM ve ürün
            bazındaki sistem miktarını,
            fiziksel sayım sonucunu ve
            uygulanacak stok farkını
            inceleyin.
          </p>
        </div>

        <span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-black text-violet-800">
          {
            lines.length
          }{" "}
          satır
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-slate-100 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Toplam Satır
          </p>

          <p className="mt-2 text-3xl font-black text-slate-950">
            {
              lines.length
            }
          </p>
        </div>

        <div className="rounded-2xl bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Farklı Satır
          </p>

          <p className="mt-2 text-3xl font-black text-amber-800">
            {
              differenceLineCount
            }
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Toplam Artış
          </p>

          <p className="mt-2 text-3xl font-black text-emerald-800">
            +{increaseTotal}
          </p>
        </div>

        <div className="rounded-2xl bg-red-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-red-700">
            Toplam Azalış
          </p>

          <p className="mt-2 text-3xl font-black text-red-800">
            -{decreaseTotal}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="min-w-64 flex-1">
          <label
            htmlFor="inventoryCountSearch"
            className="mb-2 block text-sm font-bold text-slate-700"
          >
            Satırlarda Ara
          </label>

          <input
            id="inventoryCountSearch"
            type="search"
            value={
              searchValue
            }
            onChange={(event) =>
              setSearchValue(
                event.target.value
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
            placeholder="Lokasyon, THM, ürün veya personel..."
          />
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-700">
          <input
            type="checkbox"
            checked={
              showOnlyDifferences
            }
            onChange={(event) =>
              setShowOnlyDifferences(
                event.target.checked
              )
            }
            className="h-5 w-5"
          />

          Yalnızca farkları göster
        </label>
      </div>

      {lines.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
          Bu sayımda ürün satırı
          bulunmuyor.
        </div>
      ) : visibleLines.length ===
        0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
          Seçilen filtrelere uygun
          sayım satırı bulunamadı.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100">
              <tr className="text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">
                  Lokasyon
                </th>

                <th className="px-4 py-3">
                  THM
                </th>

                <th className="px-4 py-3">
                  Ürün
                </th>

                <th className="px-4 py-3 text-right">
                  Sistem
                </th>

                <th className="px-4 py-3 text-right">
                  Sayılan
                </th>

                <th className="px-4 py-3 text-right">
                  Fark
                </th>

                <th className="px-4 py-3">
                  Sayan
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleLines.map(
                (line) => (
                  <tr
                    key={
                      line.id
                    }
                    className="border-t border-slate-200 align-top"
                  >
                    <td className="whitespace-nowrap px-4 py-4 font-black text-slate-900">
                      {
                        line.locationCode
                      }
                    </td>

                    <td className="whitespace-nowrap px-4 py-4">
                      <p className="font-bold text-slate-900">
                        {
                          line.handlingUnitBarcode
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {
                          line.handlingUnitType
                        }
                      </p>
                    </td>

                    <td className="min-w-72 px-4 py-4">
                      <p className="font-black text-slate-900">
                        {
                          line.productCode
                        }{" "}
                        -{" "}
                        {
                          line.productName
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Barkod:{" "}
                        {
                          line.productBarcode
                        }
                      </p>

                      {line.isDiscovered && (
                        <span className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                          Snapshot Dışı Ürün
                        </span>
                      )}

                      {line.note && (
                        <p className="mt-2 rounded-lg bg-blue-50 p-2 text-xs leading-5 text-blue-800">
                          Not:{" "}
                          {
                            line.note
                          }
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4 text-right text-lg font-black text-slate-700">
                      {
                        line.systemQuantity
                      }
                    </td>

                    <td className="px-4 py-4 text-right text-lg font-black text-blue-800">
                      {
                        line.countedQuantity ??
                        "-"
                      }
                    </td>

                    <td className="px-4 py-4 text-right">
                      <span
                        className={`inline-flex min-w-14 justify-center rounded-full px-3 py-2 text-base font-black ${getDifferenceStyle(
                          line.difference
                        )}`}
                      >
                        {
                          formatDifference(
                            line.difference
                          )
                        }
                      </span>
                    </td>

                    <td className="min-w-44 px-4 py-4">
                      <p className="font-semibold text-slate-700">
                        {
                          line.countedByName ||
                          "-"
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {
                          line.countedAt
                        }
                      </p>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {status === "SUBMITTED" && (
        <div className="mt-7 rounded-2xl border border-violet-200 bg-violet-50 p-5 text-violet-950">
          <h3 className="text-xl font-black">
            Sayım Yönetici Onayı
            Bekliyor
          </h3>

          <p className="mt-2 text-sm leading-6">
            Onay verdiğinizde THM,
            lokasyon ve global ürün
            stokları fiziksel sayım
            sonuçlarına göre
            güncellenecektir. Bu işlem
            geri alınamaz.
          </p>

          {uncountedLineCount > 0 && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800">
              {
                uncountedLineCount
              }{" "}
              satırda sayım miktarı
              bulunmadığı için onay
              verilemez.
            </div>
          )}

          {!canApprove && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 font-semibold text-amber-800">
              Bu sayımı stoklara
              uygulamak için
              INVENTORY_COUNT_APPROVE
              yetkisi gereklidir.
            </div>
          )}

          {canSubmitApproval && (
            <form
              action={
                approveAction
              }
              className="mt-5"
              onSubmit={(event) => {
                const confirmed =
                  window.confirm(
                    `${countNumber} numaralı sayımı onaylayıp stok farklarını uygulamak istiyor musunuz? Bu işlem geri alınamaz.`
                  );

                if (!confirmed) {
                  event.preventDefault();
                }
              }}
            >
              <ApproveButton />
            </form>
          )}
        </div>
      )}

      {status === "APPROVED" && (
        <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
          <h3 className="text-xl font-black">
            Sayım Onaylandı
          </h3>

          <p className="mt-2 text-sm leading-6">
            Sayım farkları stoklara
            uygulanmıştır. Onaylanan
            sayım değiştirilemez veya
            iptal edilemez.
          </p>
        </div>
      )}
    </section>
  );
}
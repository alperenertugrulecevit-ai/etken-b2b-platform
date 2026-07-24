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

  totalLocationCount?: number;

  completedLocationCount?: number;
};

function ApproveButton({
  disabled,
}: {
  disabled: boolean;
}) {
  const {
    pending,
  } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={
        pending ||
        disabled
      }
      className="w-full rounded-xl bg-emerald-700 px-6 py-4 text-lg font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending
        ? "Sayım onaylanıyor ve stoklar güncelleniyor..."
        : "Sayımı Onayla ve Stoklara Uygula"}
    </button>
  );
}

function getDifferenceStyle(
  difference: number
) {
  if (difference > 0) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (difference < 0) {
    return "bg-red-100 text-red-800";
  }

  return "bg-slate-100 text-slate-700";
}

function formatDifference(
  difference: number
) {
  if (difference > 0) {
    return `+${difference}`;
  }

  return String(difference);
}

function getApprovalDifference(
  line: InventoryCountApprovalLine
) {
  if (
    line.appliedQuantityChange !==
    null
  ) {
    return line.appliedQuantityChange;
  }

  return (
    (
      line.countedQuantity ??
      0
    ) -
    line.systemQuantity
  );
}

function getApprovalQuantity(
  line: InventoryCountApprovalLine
) {
  return (
    line.countedQuantity ??
    0
  );
}

export default function InventoryCountApprovalPanel({
  inventoryCountId,
  countNumber,
  status,
  canApprove,
  lines,
  totalLocationCount,
  completedLocationCount,
}: InventoryCountApprovalPanelProps) {
  const [
    showOnlyDifferences,
    setShowOnlyDifferences,
  ] = useState(false);

  const [
    searchValue,
    setSearchValue,
  ] = useState("");

  const [
    approvalPassword,
    setApprovalPassword,
  ] = useState("");

  const [
    riskAccepted,
    setRiskAccepted,
  ] = useState(false);

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

  const statusAllowsApproval =
    status === "ACTIVE" ||
    status === "IN_PROGRESS" ||
    status === "SUBMITTED";

  const inferredIncompleteLocations =
    status === "ACTIVE" ||
    status === "IN_PROGRESS";

  const hasLocationCounts =
    typeof totalLocationCount ===
      "number" &&
    typeof completedLocationCount ===
      "number";

  const hasIncompleteLocations =
    hasLocationCounts
      ? completedLocationCount <
        totalLocationCount
      : inferredIncompleteLocations;

  const incompleteLocationCount =
    hasLocationCounts
      ? Math.max(
          totalLocationCount -
            completedLocationCount,
          0
        )
      : null;

  const uncountedLineCount =
    lines.filter(
      (line) =>
        line.countedQuantity ===
        null
    ).length;

  const automaticZeroQuantity =
    lines.reduce(
      (
        total,
        line
      ) =>
        total +
        (
          line.countedQuantity ===
          null
            ? line.systemQuantity
            : 0
        ),
      0
    );

  const hasRecountRequired =
    lines.some(
      (line) =>
        line.status ===
        "RECOUNT_REQUIRED"
    );

  const visibleLines =
    useMemo(
      () =>
        lines.filter(
          (line) => {
            const approvalDifference =
              getApprovalDifference(
                line
              );

            if (
              showOnlyDifferences &&
              approvalDifference ===
                0
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
        getApprovalDifference(
          line
        ) !== 0
    ).length;

  const increaseTotal =
    lines.reduce(
      (
        total,
        line
      ) => {
        const difference =
          getApprovalDifference(
            line
          );

        return (
          total +
          (
            difference > 0
              ? difference
              : 0
          )
        );
      },
      0
    );

  const decreaseTotal =
    lines.reduce(
      (
        total,
        line
      ) => {
        const difference =
          getApprovalDifference(
            line
          );

        return (
          total +
          (
            difference < 0
              ? Math.abs(
                  difference
                )
              : 0
          )
        );
      },
      0
    );

  const canSubmitApproval =
    statusAllowsApproval &&
    canApprove &&
    !hasRecountRequired &&
    approvalPassword.length > 0 &&
    (
      !hasIncompleteLocations ||
      riskAccepted
    );

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
            stoklara uygulanacak farkı
            inceleyin.
          </p>
        </div>

        <span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-black text-violet-800">
          {lines.length} satır
        </span>
      </div>

      {uncountedLineCount > 0 &&
        status !== "APPROVED" &&
        status !== "CANCELLED" && (
          <div className="mt-6 rounded-2xl border-2 border-red-300 bg-red-50 p-5 text-red-950">
            <h3 className="text-lg font-black">
              Sayılmamış Ürünler
              Bulunuyor
            </h3>

            <p className="mt-2 text-sm font-semibold leading-6">
              {
                uncountedLineCount
              }{" "}
              ürün / THM satırında
              fiziksel sayım sonucu
              bulunmuyor. Sayımı şimdi
              onaylarsanız bu ürünlerin
              sayım sonucu{" "}
              <strong>0</strong>{" "}
              kabul edilecek ve toplam{" "}
              <strong>
                {
                  automaticZeroQuantity
                }
              </strong>{" "}
              adet stok sistemden
              düşülecektir.
            </p>
          </div>
        )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-slate-100 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Toplam Satır
          </p>

          <p className="mt-2 text-3xl font-black text-slate-950">
            {lines.length}
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
                  Sayım Sonucu
                </th>

                <th className="px-4 py-3 text-right">
                  Uygulanacak Fark
                </th>

                <th className="px-4 py-3">
                  Sayan
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleLines.map(
                (line) => {
                  const approvalQuantity =
                    getApprovalQuantity(
                      line
                    );

                  const approvalDifference =
                    getApprovalDifference(
                      line
                    );

                  const automaticallyZero =
                    line.countedQuantity ===
                    null;

                  return (
                    <tr
                      key={
                        line.id
                      }
                      className={`border-t border-slate-200 align-top ${
                        automaticallyZero
                          ? "bg-red-50/60"
                          : ""
                      }`}
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
                            Snapshot Dışı
                            Ürün
                          </span>
                        )}

                        {automaticallyZero &&
                          status !==
                            "APPROVED" && (
                            <span className="mt-2 inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-800">
                              Onayda 0
                              Kabul Edilecek
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

                      <td
                        className={`px-4 py-4 text-right text-lg font-black ${
                          automaticallyZero
                            ? "text-red-700"
                            : "text-blue-800"
                        }`}
                      >
                        {
                          approvalQuantity
                        }

                        {automaticallyZero &&
                          status !==
                            "APPROVED" && (
                            <p className="mt-1 text-xs font-bold text-red-600">
                              Otomatik
                            </p>
                          )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <span
                          className={`inline-flex min-w-14 justify-center rounded-full px-3 py-2 text-base font-black ${getDifferenceStyle(
                            approvalDifference
                          )}`}
                        >
                          {formatDifference(
                            approvalDifference
                          )}
                        </span>
                      </td>

                      <td className="min-w-44 px-4 py-4">
                        <p className="font-semibold text-slate-700">
                          {line.countedByName ||
                            (
                              automaticallyZero
                                ? "Onaylayan kullanıcı"
                                : "-"
                            )}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {
                            line.countedAt
                          }
                        </p>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      )}

      {statusAllowsApproval && (
        <div className="mt-7 rounded-2xl border-2 border-violet-300 bg-violet-50 p-5 text-violet-950">
          <h3 className="text-xl font-black">
            Sayımı Onayla
          </h3>

          <p className="mt-2 text-sm leading-6">
            Onay verdiğinizde THM,
            lokasyon ve global ürün
            stokları yukarıdaki sayım
            sonuçlarına göre
            güncellenecektir. Bu işlem
            geri alınamaz.
          </p>

          {hasIncompleteLocations && (
            <div className="mt-5 rounded-2xl border-2 border-red-300 bg-red-50 p-5 text-red-950">
              <h4 className="text-lg font-black">
                Sayılmayan
                Lokasyonlar Var
              </h4>

              <p className="mt-2 text-sm font-semibold leading-6">
                {incompleteLocationCount !==
                null
                  ? `${incompleteLocationCount} lokasyon henüz tamamlanmadı. `
                  : "Bazı lokasyonlar henüz tamamlanmadı. "}

                Bu lokasyonlardaki
                okutulmayan bütün
                ürünler gerçekten eksik
                kabul edilerek sayım
                sonucu{" "}
                <strong>0</strong>{" "}
                yapılacak ve stoklardan
                düşülecektir.
              </p>

              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-red-300 bg-white p-4">
                <input
                  type="checkbox"
                  checked={
                    riskAccepted
                  }
                  onChange={(event) =>
                    setRiskAccepted(
                      event.target.checked
                    )
                  }
                  className="mt-1 h-5 w-5 shrink-0"
                />

                <span className="text-sm font-bold leading-6 text-red-900">
                  Sayılmayan ürünlerin
                  0 kabul edilerek
                  stoklardan
                  düşüleceğini
                  anlıyorum ve devam
                  etmek istiyorum.
                </span>
              </label>
            </div>
          )}

          {hasRecountRequired && (
            <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 font-semibold text-red-800">
              Tekrar sayım bekleyen
              ürün satırı bulunduğu için
              onay verilemez.
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

          {canApprove &&
            !hasRecountRequired && (
              <form
                action={
                  approveAction
                }
                className="mt-5 space-y-4"
                onSubmit={(
                  event
                ) => {
                  if (
                    !approvalPassword
                  ) {
                    event.preventDefault();

                    window.alert(
                      "Sayımı onaylamak için giriş şifrenizi yazın."
                    );

                    return;
                  }

                  if (
                    hasIncompleteLocations &&
                    !riskAccepted
                  ) {
                    event.preventDefault();

                    window.alert(
                      "Sayılmayan lokasyonlarla devam etmek için risk onay kutusunu işaretleyin."
                    );

                    return;
                  }

                  const warningMessage =
                    hasIncompleteLocations
                      ? (
                          "Sayılmayan lokasyonlar var. Devam edilsin mi?\n\n" +
                          "Bu lokasyonlardaki okutulmayan tüm ürünler 0 kabul edilecek ve stoklardan düşülecektir.\n\n" +
                          "Bu işlem geri alınamaz."
                        )
                      : (
                          `${countNumber} numaralı sayımı onaylayıp stok farklarını uygulamak istiyor musunuz?\n\n` +
                          "Bu işlem geri alınamaz."
                        );

                  const confirmed =
                    window.confirm(
                      warningMessage
                    );

                  if (!confirmed) {
                    event.preventDefault();
                  }
                }}
              >
                <input
                  type="hidden"
                  name="confirmIncompleteLocations"
                  value={
                    hasIncompleteLocations &&
                    riskAccepted
                      ? "true"
                      : "false"
                  }
                />

                <div>
                  <label
                    htmlFor={`approvalPassword-${inventoryCountId}`}
                    className="mb-2 block text-sm font-black text-violet-950"
                  >
                    Onay Şifresi
                  </label>

                  <input
                    id={`approvalPassword-${inventoryCountId}`}
                    name="approvalPassword"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={
                      approvalPassword
                    }
                    onChange={(event) =>
                      setApprovalPassword(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-violet-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-violet-700 focus:ring-2 focus:ring-violet-700/20"
                    placeholder="Giriş şifrenizi yazın"
                  />

                  <p className="mt-2 text-xs leading-5 text-violet-700">
                    Güvenlik için
                    sisteme giriş
                    yaparken
                    kullandığınız kendi
                    şifrenizi yazın.
                  </p>
                </div>

                <ApproveButton
                  disabled={
                    !canSubmitApproval
                  }
                />
              </form>
            )}
        </div>
      )}

      {status === "DRAFT" && (
        <div className="mt-7 rounded-2xl border border-slate-300 bg-slate-50 p-5 text-slate-800">
          <h3 className="text-xl font-black">
            Sayım Henüz Başlatılmadı
          </h3>

          <p className="mt-2 text-sm leading-6">
            Taslak durumundaki sayım
            başlatılmadan stoklara
            uygulanamaz.
          </p>
        </div>
      )}

      {status === "APPROVED" && (
        <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
          <h3 className="text-xl font-black">
            Sayım Onaylandı
          </h3>

          <p className="mt-2 text-sm leading-6">
            Sayım sonuçları stoklara
            uygulanmıştır. Onaylanan
            sayım değiştirilemez veya
            iptal edilemez.
          </p>
        </div>
      )}

      {status === "CANCELLED" && (
        <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-950">
          <h3 className="text-xl font-black">
            Sayım İptal Edildi
          </h3>

          <p className="mt-2 text-sm leading-6">
            İptal edilmiş sayım
            stoklara uygulanamaz.
          </p>
        </div>
      )}
    </section>
  );
}
"use client";

import {
  type FormEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  lookupShippingUnitAction,
  shipHandlingUnitAction,
} from "@/app/rf/shipping/actions";

import type {
  ReadyShippingUnitSummary,
  ShippingUnitDetail,
} from "@/modules/fulfillment/services/shipping.service";

type Props = {
  initialUnits:
    ReadyShippingUnitSummary[];
};

function formatDate(
  value: string | null
) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(value));
}

export default function RFShippingForm({
  initialUnits,
}: Props) {
  const barcodeInputRef =
    useRef<HTMLInputElement>(null);

  const [
    units,
    setUnits,
  ] = useState(initialUnits);

  const [
    barcode,
    setBarcode,
  ] = useState("");

  const [
    selectedUnit,
    setSelectedUnit,
  ] =
    useState<ShippingUnitDetail | null>(
      null
    );

  const [
    carrierName,
    setCarrierName,
  ] = useState("");

  const [
    vehiclePlate,
    setVehiclePlate,
  ] = useState("");

  const [
    driverName,
    setDriverName,
  ] = useState("");

  const [
    driverIdentityNumber,
    setDriverIdentityNumber,
  ] = useState("");

  const [
    notes,
    setNotes,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState(false);

  const [
    isLookingUp,
    setIsLookingUp,
  ] = useState(false);

  const [
    isShipping,
    setIsShipping,
  ] = useState(false);

  const totalReadyQuantity =
    useMemo(
      () =>
        units.reduce(
          (total, unit) =>
            total +
            unit.totalQuantity,
          0
        ),
      [units]
    );

  function clearSelection() {
    setSelectedUnit(null);
    setBarcode("");
    setMessage("");
    setSuccess(false);

    requestAnimationFrame(() => {
      barcodeInputRef.current?.focus();
    });
  }

  async function lookupBarcode(
    event?: FormEvent
  ) {
    event?.preventDefault();

    if (
      isLookingUp ||
      isShipping
    ) {
      return;
    }

    setMessage("");
    setSuccess(false);
    setIsLookingUp(true);

    try {
      const result =
        await lookupShippingUnitAction(
          barcode
        );

      if (!result.success) {
        setSelectedUnit(null);
        setMessage(result.message);
        return;
      }

      setSelectedUnit(result.unit);
      setBarcode(
        result.unit.barcode
      );
    } catch (error) {
      console.error(error);
      setSelectedUnit(null);
      setMessage(
        "Sevk THM sorgulanamadı. Lütfen yeniden deneyin."
      );
    } finally {
      setIsLookingUp(false);
    }
  }

  async function shipSelectedUnit() {
    if (
      !selectedUnit ||
      isLookingUp ||
      isShipping
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `${selectedUnit.barcode} barkodlu Sevk THM stoktan düşülerek sevk edilecek. Devam edilsin mi?`
      );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setSuccess(false);
    setIsShipping(true);

    try {
      const result =
        await shipHandlingUnitAction({
          barcode:
            selectedUnit.barcode,
          carrierName,
          vehiclePlate,
          driverName,
          driverIdentityNumber,
          notes,
        });

      if (!result.success) {
        setMessage(result.message);
        return;
      }

      setUnits((current) =>
        current.filter(
          (unit) =>
            unit.id !==
            selectedUnit.id
        )
      );

      setMessage(result.message);
      setSuccess(true);
      setSelectedUnit(null);
      setBarcode("");
      setNotes("");

      requestAnimationFrame(() => {
        barcodeInputRef.current?.focus();
      });
    } catch (error) {
      console.error(error);
      setMessage(
        "Sevkiyat işlemi tamamlanamadı. Lütfen yeniden deneyin."
      );
    } finally {
      setIsShipping(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="text-xl font-black text-slate-950">
            Sevk THM Okut
          </h2>

          <form
            onSubmit={lookupBarcode}
            className="mt-4 flex flex-col gap-3 sm:flex-row"
          >
            <input
              ref={barcodeInputRef}
              value={barcode}
              onChange={(event) => {
                setBarcode(
                  event.target.value.toUpperCase()
                );
                setSelectedUnit(null);
                setMessage("");
              }}
              autoFocus
              autoComplete="off"
              placeholder="Sevk THM barkodunu okutun"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-4 font-mono text-lg font-bold uppercase outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />

            <button
              type="submit"
              disabled={
                isLookingUp ||
                isShipping ||
                !barcode.trim()
              }
              className="rounded-xl bg-blue-900 px-6 py-4 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isLookingUp
                ? "Sorgulanıyor..."
                : "THM Sorgula"}
            </button>
          </form>

          {message && (
            <div
              role={
                success
                  ? "status"
                  : "alert"
              }
              className={`mt-4 rounded-xl border p-4 font-semibold leading-6 ${
                success
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {message}
            </div>
          )}
        </div>

        {selectedUnit && (
          <div className="rounded-2xl border-2 border-blue-300 bg-white p-5 shadow">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  Sevkiyata Hazır
                </p>

                <h2 className="mt-2 font-mono text-2xl font-black text-slate-950">
                  {selectedUnit.barcode}
                </h2>

                <p className="mt-2 font-bold text-slate-800">
                  {
                    selectedUnit.customerName
                  }
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedUnit.address},{" "}
                  {selectedUnit.district}/
                  {selectedUnit.city}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  clearSelection
                }
                className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-700"
              >
                THM Temizle
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-100 p-3">
                <p className="text-xs font-bold text-slate-500">
                  Koli Sırası
                </p>
                <p className="mt-1 text-xl font-black">
                  {String(
                    selectedUnit.packageSequence
                  ).padStart(3, "0")}
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 p-3">
                <p className="text-xs font-bold text-slate-500">
                  Sipariş
                </p>
                <p className="mt-1 text-xl font-black">
                  {
                    selectedUnit
                      .orderNumbers
                      .length
                  }
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 p-3">
                <p className="text-xs font-bold text-slate-500">
                  SKU
                </p>
                <p className="mt-1 text-xl font-black">
                  {
                    selectedUnit.items
                      .length
                  }
                </p>
              </div>

              <div className="rounded-xl bg-blue-100 p-3 text-blue-950">
                <p className="text-xs font-bold">
                  Toplam Adet
                </p>
                <p className="mt-1 text-xl font-black">
                  {
                    selectedUnit.totalQuantity
                  }
                </p>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto rounded-xl border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-3">
                      Sipariş
                    </th>
                    <th className="px-3 py-3">
                      Ürün
                    </th>
                    <th className="px-3 py-3 text-right">
                      Adet
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {selectedUnit.items.map(
                    (item) => (
                      <tr
                        key={item.id}
                        className="border-t"
                      >
                        <td className="whitespace-nowrap px-3 py-3 font-bold">
                          {
                            item.orderNumber
                          }
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-bold">
                            {
                              item.productCode
                            }
                          </p>
                          <p className="text-xs text-slate-500">
                            {
                              item.productName
                            }
                          </p>
                        </td>
                        <td className="px-3 py-3 text-right text-lg font-black">
                          {
                            item.quantity
                          }
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-bold">
                  Taşıyıcı
                </span>
                <input
                  value={carrierName}
                  onChange={(event) =>
                    setCarrierName(
                      event.target.value
                    )
                  }
                  placeholder="İsteğe bağlı"
                  className="w-full rounded-xl border p-3"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-bold">
                  Araç Plakası
                </span>
                <input
                  value={vehiclePlate}
                  onChange={(event) =>
                    setVehiclePlate(
                      event.target.value.toUpperCase()
                    )
                  }
                  placeholder="34 ABC 123"
                  className="w-full rounded-xl border p-3 uppercase"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-bold">
                  Sürücü
                </span>
                <input
                  value={driverName}
                  onChange={(event) =>
                    setDriverName(
                      event.target.value
                    )
                  }
                  placeholder="İsteğe bağlı"
                  className="w-full rounded-xl border p-3"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-bold">
                  Sürücü T.C. No
                </span>
                <input
                  value={
                    driverIdentityNumber
                  }
                  onChange={(event) =>
                    setDriverIdentityNumber(
                      event.target.value.replace(
                        /\D/g,
                        ""
                      )
                    )
                  }
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="İsteğe bağlı"
                  className="w-full rounded-xl border p-3"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-bold">
                Sevkiyat Notu
              </span>
              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value
                  )
                }
                rows={3}
                maxLength={500}
                placeholder="İsteğe bağlı"
                className="w-full resize-none rounded-xl border p-3"
              />
            </label>

            <button
              type="button"
              onClick={
                shipSelectedUnit
              }
              disabled={isShipping}
              className="mt-5 w-full rounded-xl bg-emerald-700 py-4 text-lg font-black text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isShipping
                ? "Sevk ediliyor..."
                : "Sevk THM Çıkışını Onayla"}
            </button>
          </div>
        )}
      </div>

      <aside className="h-fit rounded-2xl bg-white p-5 shadow">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">
              Hazır THM Listesi
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {units.length} THM ·{" "}
              {totalReadyQuantity} adet
            </p>
          </div>
        </div>

        {units.length === 0 ? (
          <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-800">
            Sevkiyat bekleyen Sevk THM
            bulunmuyor.
          </div>
        ) : (
          <div className="mt-4 max-h-[720px] space-y-3 overflow-y-auto pr-1">
            {units.map((unit) => (
              <button
                key={unit.id}
                type="button"
                onClick={() => {
                  setBarcode(
                    unit.barcode
                  );
                  setSelectedUnit(null);
                  setMessage("");
                  setSuccess(false);
                  requestAnimationFrame(
                    () =>
                      barcodeInputRef.current?.focus()
                  );
                }}
                className="w-full rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-500 hover:bg-blue-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <code className="font-black text-blue-900">
                    {unit.barcode}
                  </code>
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-black text-blue-800">
                    {
                      unit.totalQuantity
                    }{" "}
                    adet
                  </span>
                </div>

                <p className="mt-2 font-bold text-slate-900">
                  {unit.customerName}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {unit.district}/
                  {unit.city} · Koli{" "}
                  {String(
                    unit.packageSequence
                  ).padStart(3, "0")}
                </p>

                <p className="mt-1 truncate text-xs text-slate-500">
                  {
                    unit.orderNumbers.join(
                      ", "
                    )
                  }
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Hazır:{" "}
                  {formatDate(
                    unit.readyAt
                  )}
                </p>
              </button>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

"use client";

import {
  useActionState,
  useMemo,
  useState,
} from "react";

import {
  receivePurchaseOrder,
  type PurchaseReceiptActionState,
} from "@/app/admin/purchase-orders/[id]/receive/actions";

type PurchaseItem = {
  id: number;
  productCode: string;
  productName: string;
  orderedQuantity: number;
  receivedQuantity: number;
};

type Props = {
  purchaseOrderId: number;
  items: PurchaseItem[];
};

const initialState:
  PurchaseReceiptActionState = {
  success: false,
  message: "",
};

export default function PurchaseReceiptForm({
  purchaseOrderId,
  items,
}: Props) {
  const [quantities, setQuantities] =
    useState<Record<number, number>>(
      Object.fromEntries(
        items.map((item) => [
          item.id,
          0,
        ])
      )
    );

  const boundAction =
    receivePurchaseOrder.bind(
      null,
      purchaseOrderId
    );

  const [state, formAction, isPending] =
    useActionState(
      boundAction,
      initialState
    );

  const itemsJson = useMemo(
    () =>
      JSON.stringify(
        items.map((item) => ({
          purchaseOrderItemId:
            item.id,

          quantity:
            quantities[item.id] ??
            0,
        }))
      ),
    [items, quantities]
  );

  const totalReceiptQuantity =
    Object.values(
      quantities
    ).reduce(
      (total, quantity) =>
        total + quantity,
      0
    );

  function receiveAllRemaining() {
    setQuantities(
      Object.fromEntries(
        items.map((item) => [
          item.id,
          item.orderedQuantity -
            item.receivedQuantity,
        ])
      )
    );
  }

  return (
    <form
      action={formAction}
      className="mt-8 rounded-2xl bg-white p-6 shadow"
    >
      <input
        type="hidden"
        name="itemsJson"
        value={itemsJson}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            Teslim Alınan Miktarlar
          </h2>

          <p className="mt-2 text-gray-500">
            Bu teslimatta gerçekten gelen
            miktarları girin.
          </p>
        </div>

        <button
          type="button"
          onClick={
            receiveAllRemaining
          }
          className="rounded-xl bg-slate-800 px-5 py-3 font-semibold text-white hover:bg-slate-700"
        >
          Tüm Kalanı Doldur
        </button>
      </div>

      {state.message && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
          <p className="font-bold">
            İşlem gerçekleştirilemedi
          </p>

          <p className="mt-2">
            {state.message}
          </p>
        </div>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[950px] text-left">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="p-4">
                Ürün Kodu
              </th>

              <th className="p-4">
                Ürün
              </th>

              <th className="p-4">
                Sipariş
              </th>

              <th className="p-4">
                Önceki Kabul
              </th>

              <th className="p-4">
                Kalan
              </th>

              <th className="p-4">
                Bu Kabul
              </th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => {
              const remaining =
                item.orderedQuantity -
                item.receivedQuantity;

              return (
                <tr
                  key={item.id}
                  className="border-b"
                >
                  <td className="p-4 font-bold text-blue-900">
                    {item.productCode}
                  </td>

                  <td className="p-4 font-semibold">
                    {item.productName}
                  </td>

                  <td className="p-4">
                    {
                      item.orderedQuantity
                    }
                  </td>

                  <td className="p-4">
                    {
                      item.receivedQuantity
                    }
                  </td>

                  <td className="p-4 font-bold text-orange-700">
                    {remaining}
                  </td>

                  <td className="p-4">
                    <input
                      type="number"
                      min="0"
                      max={remaining}
                      step="1"
                      disabled={
                        remaining === 0
                      }
                      value={
                        quantities[
                          item.id
                        ] ?? 0
                      }
                      onChange={(
                        event
                      ) => {
                        const value =
                          Number(
                            event.target
                              .value
                          );

                        setQuantities(
                          (
                            current
                          ) => ({
                            ...current,

                            [item.id]:
                              Number.isFinite(
                                value
                              )
                                ? value
                                : 0,
                          })
                        );
                      }}
                      className="w-32 rounded-xl border p-3"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-semibold">
            İrsaliye / Belge No
          </span>

          <input
            name="documentNumber"
            placeholder="Örneğin: IRS-2026-001"
            className="w-full rounded-xl border p-4"
          />
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Mal Kabul Açıklaması
          </span>

          <input
            name="description"
            placeholder="Örneğin: İlk kısmi teslimat"
            className="w-full rounded-xl border p-4"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-5">
        <p className="font-semibold">
          Bu kabul toplamı:{" "}
          <span className="text-xl text-blue-900">
            {totalReceiptQuantity}
          </span>
        </p>

        <button
          type="submit"
          disabled={
            isPending ||
            totalReceiptQuantity <= 0
          }
          className={`rounded-xl px-8 py-4 font-bold ${
            !isPending &&
            totalReceiptQuantity > 0
              ? "bg-green-700 text-white hover:bg-green-800"
              : "cursor-not-allowed bg-slate-300 text-slate-500"
          }`}
        >
          {isPending
            ? "Mal Kabul Kaydediliyor..."
            : "Mal Kabulü Kaydet"}
        </button>
      </div>
    </form>
  );
}
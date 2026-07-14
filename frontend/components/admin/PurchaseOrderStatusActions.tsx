import Link from "next/link";

import {
  PurchaseOrderStatus,
} from "@prisma/client";

import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
} from "@/app/admin/purchase-orders/[id]/status-actions";

import {
  copyPurchaseOrder,
} from "@/app/admin/purchase-orders/[id]/copy-actions";

type Props = {
  purchaseOrderId: number;
  status: PurchaseOrderStatus;
  itemCount: number;
  hasReceivedQuantity: boolean;
};

export default function PurchaseOrderStatusActions({
  purchaseOrderId,
  status,
  itemCount,
  hasReceivedQuantity,
}: Props) {
  const canApprove =
    status === PurchaseOrderStatus.DRAFT &&
    itemCount > 0;

  const canCancel =
    (
      status === PurchaseOrderStatus.DRAFT ||
      status === PurchaseOrderStatus.PENDING
    ) &&
    !hasReceivedQuantity;

  const canReceive =
    status ===
      PurchaseOrderStatus.APPROVED ||
    status ===
      PurchaseOrderStatus.PARTIALLY_RECEIVED;

  const canViewReceipts =
    hasReceivedQuantity ||
    status ===
      PurchaseOrderStatus.PARTIALLY_RECEIVED ||
    status ===
      PurchaseOrderStatus.RECEIVED;

  const canCopy =
    itemCount > 0;

  return (
    <section className="rounded-2xl bg-white p-6 shadow">
      <h2 className="text-2xl font-bold">
        Satın Alma İşlemleri
      </h2>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        Satın alma onayı, mal kabul,
        teslimat geçmişi ve kopyalama
        işlemlerini yönetin.
      </p>

      <div className="mt-6 space-y-3">
        {canApprove && (
          <form
            action={approvePurchaseOrder.bind(
              null,
              purchaseOrderId
            )}
          >
            <button
              type="submit"
              className="w-full rounded-xl bg-green-700 py-4 font-bold text-white hover:bg-green-800"
            >
              ✓ Satın Almayı Onayla
            </button>
          </form>
        )}

        {status ===
          PurchaseOrderStatus.DRAFT &&
          itemCount === 0 && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
              Onaylamak için önce en az bir
              ürün satırı ekleyin.
            </div>
          )}

        {canReceive && (
          <Link
            href={`/admin/purchase-orders/${purchaseOrderId}/receive`}
            className="block w-full rounded-xl bg-blue-900 py-4 text-center font-bold text-white hover:bg-blue-800"
          >
            📦 Mal Kabul Yap
          </Link>
        )}

        {canViewReceipts && (
          <Link
            href={`/admin/purchase-orders/${purchaseOrderId}/receipts`}
            className="block w-full rounded-xl bg-slate-800 py-4 text-center font-bold text-white hover:bg-slate-700"
          >
            📋 Mal Kabul Geçmişi
          </Link>
        )}

        {canCopy && (
          <form
            action={copyPurchaseOrder.bind(
              null,
              purchaseOrderId
            )}
            
          >
            <button
              type="submit"
              className="w-full rounded-xl border-2 border-blue-900 bg-white py-4 font-bold text-blue-900 hover:bg-blue-50"
            >
                <Link
  href={`/admin/purchase-orders/${purchaseOrderId}/print`}
  className="block w-full rounded-xl bg-slate-700 py-4 text-center font-bold text-white hover:bg-slate-600"
>
  🖨️ Satın Alma Belgesini Aç
</Link>
              📄 Satın Almayı Kopyala
            </button>
          </form>
        )}

        {canCancel && (
          <form
            action={cancelPurchaseOrder.bind(
              null,
              purchaseOrderId
            )}
          >
            <button
              type="submit"
              className="w-full rounded-xl bg-red-600 py-4 font-bold text-white hover:bg-red-700"
            >
              Satın Almayı İptal Et
            </button>
          </form>
        )}
      </div>

      {canCopy && (
        <div className="mt-5 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">
          Kopyalama işleminde yeni bir Taslak
          satın alma oluşturulur. Mal kabul
          miktarları ve stok hareketleri
          kopyalanmaz.
        </div>
      )}
    </section>
  );
}
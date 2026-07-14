import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  PurchaseOrderStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import PurchaseOrderEditForm from "@/components/admin/PurchaseOrderEditForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateForInput(
  value: Date | null
) {
  if (!value) {
    return "";
  }

  const year =
    value.getFullYear();

  const month = String(
    value.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    value.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function EditPurchaseOrderPage({
  params,
}: Props) {
  const { id } = await params;

  const purchaseOrderId =
    Number(id);

  if (
    !Number.isInteger(
      purchaseOrderId
    ) ||
    purchaseOrderId <= 0
  ) {
    notFound();
  }

  const [
    purchaseOrder,
    suppliers,
  ] = await Promise.all([
    prisma.purchaseOrder.findUnique({
      where: {
        id: purchaseOrderId,
      },

      select: {
        id: true,
        purchaseNumber: true,
        supplierId: true,
        status: true,
        expectedDate: true,
        supplierNote: true,
        internalNote: true,

        items: {
          select: {
            receivedQuantity: true,
          },
        },
      },
    }),

    prisma.supplier.findMany({
      where: {
        isActive: true,
      },

      orderBy: {
        name: "asc",
      },

      select: {
        id: true,
        name: true,
        paymentTermDays: true,
        discountRate: true,
        deliveryDays: true,
      },
    }),
  ]);

  if (!purchaseOrder) {
    notFound();
  }

  const hasReceivedQuantity =
    purchaseOrder.items.some(
      (item) =>
        item.receivedQuantity > 0
    );

  if (
    purchaseOrder.status !==
      PurchaseOrderStatus.DRAFT ||
    hasReceivedQuantity
  ) {
    redirect(
      `/admin/purchase-orders/${purchaseOrderId}`
    );
  }

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Satın Alma Güncelle
          </h1>

          <p className="mt-3 text-xl font-bold text-blue-900">
            {
              purchaseOrder.purchaseNumber
            }
          </p>

          <p className="mt-2 text-gray-500">
            Taslak satın alma siparişinin
            tedarikçi, teslim tarihi ve not
            bilgilerini güncelleyin.
          </p>
        </div>

        <Link
          href={`/admin/purchase-orders/${purchaseOrder.id}`}
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
        >
          ← Satın Alma Detayına Dön
        </Link>
      </div>

      <div className="mt-8 rounded-xl border border-orange-200 bg-orange-50 p-5 text-orange-800">
        Tedarikçi değişirse satın alma
        satırları yeni iskonto oranına göre
        yeniden hesaplanacaktır.
      </div>

      <div className="mx-auto max-w-5xl">
        <PurchaseOrderEditForm
          purchaseOrderId={
            purchaseOrder.id
          }
          suppliers={suppliers}
          initialSupplierId={
            purchaseOrder.supplierId
          }
          initialExpectedDate={
            formatDateForInput(
              purchaseOrder.expectedDate
            )
          }
          initialSupplierNote={
            purchaseOrder.supplierNote ??
            ""
          }
          initialInternalNote={
            purchaseOrder.internalNote ??
            ""
          }
        />
      </div>
    </section>
  );
}
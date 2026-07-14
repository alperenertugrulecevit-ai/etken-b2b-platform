import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  PurchaseOrderStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import PurchaseReceiptForm from "@/components/admin/PurchaseReceiptForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PurchaseReceiptPage({
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

  const purchaseOrder =
    await prisma.purchaseOrder.findUnique({
      where: {
        id: purchaseOrderId,
      },

      include: {
        supplier: {
          select: {
            name: true,
          },
        },

        items: {
          orderBy: {
            id: "asc",
          },

          select: {
            id: true,
            productCode: true,
            productName: true,
            orderedQuantity: true,
            receivedQuantity: true,
          },
        },
      },
    });

  if (!purchaseOrder) {
    notFound();
  }

  if (
    purchaseOrder.status !==
      PurchaseOrderStatus.APPROVED &&
    purchaseOrder.status !==
      PurchaseOrderStatus.PARTIALLY_RECEIVED
  ) {
    redirect(
      `/admin/purchase-orders/${purchaseOrderId}`
    );
  }

  const openItems =
    purchaseOrder.items.filter(
      (item) =>
        item.receivedQuantity <
        item.orderedQuantity
    );

  if (openItems.length === 0) {
    redirect(
      `/admin/purchase-orders/${purchaseOrderId}`
    );
  }

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Mal Kabul
          </h1>

          <p className="mt-3 text-xl font-bold text-blue-900">
            {
              purchaseOrder.purchaseNumber
            }
          </p>

          <p className="mt-2 text-gray-500">
            {
              purchaseOrder.supplier.name
            }
          </p>
        </div>

        <Link
          href={`/admin/purchase-orders/${purchaseOrder.id}`}
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
        >
          ← Satın Alma Detayına Dön
        </Link>
      </div>

      <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-5 text-green-800">
        Kaydedilen miktarlar fiziksel stoğa
        eklenecek ve satın alma bağlantılı
        stok hareketi oluşturulacaktır.
      </div>

      <PurchaseReceiptForm
        purchaseOrderId={
          purchaseOrder.id
        }
        items={openItems}
      />
    </section>
  );
}
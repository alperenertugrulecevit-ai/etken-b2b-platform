import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import PurchaseOrderItemForm from "@/components/admin/PurchaseOrderItemForm";
import PurchaseOrderItemEditForm from "@/components/admin/PurchaseOrderItemEditForm";
import PurchaseOrderStatusActions from "@/components/admin/PurchaseOrderStatusActions";

import {
  deletePurchaseOrderItem,
} from "./actions";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function formatCurrency(
  value: number
) {
  return value.toLocaleString(
    "tr-TR",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

function formatDate(
  value: Date | null
) {
  if (!value) {
    return "Belirtilmedi";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(value);
}

function getStatusLabel(
  status: string
) {
  const labels: Record<
    string,
    string
  > = {
    DRAFT: "Taslak",
    PENDING: "Bekliyor",
    APPROVED: "Onaylandı",
    PARTIALLY_RECEIVED:
      "Kısmi Mal Kabul",
    RECEIVED: "Tamamlandı",
    CANCELLED: "İptal",
  };

  return labels[status] ?? status;
}

export default async function PurchaseOrderDetailPage({
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

  const [purchaseOrder, products] =
    await Promise.all([
      prisma.purchaseOrder.findUnique({
        where: {
          id: purchaseOrderId,
        },

        include: {
          supplier: true,

          items: {
            orderBy: {
              id: "asc",
            },
          },
        },
      }),

      prisma.product.findMany({
        where: {
          isActive: true,
        },

        orderBy: [
          {
            name: "asc",
          },
          {
            code: "asc",
          },
        ],

        select: {
          id: true,
          code: true,
          name: true,
          vat: true,
        },
      }),
    ]);

  if (!purchaseOrder) {
    notFound();
  }

  const isEditable =
    purchaseOrder.status ===
    "DRAFT";

    const hasReceivedQuantity =
  purchaseOrder.items.some(
    (item) =>
      item.receivedQuantity > 0
  );

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-bold">
              Satın Alma Detayı
            </h1>

            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              {getStatusLabel(
                purchaseOrder.status
              )}
            </span>
          </div>

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

        <div className="flex flex-wrap gap-3">
  {purchaseOrder.status ===
    "DRAFT" &&
    !hasReceivedQuantity && (
      <Link
        href={`/admin/purchase-orders/${purchaseOrder.id}/edit`}
        className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800"
      >
        ✏️ Satın Almayı Güncelle
      </Link>
    )}

  <Link
    href="/admin/purchase-orders"
    className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
  >
    ← Satın Alma Listesine Dön
  </Link>
</div>
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-2xl font-bold">
              Sipariş Bilgileri
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-gray-500">
                  Tedarikçi
                </p>

                <p className="mt-2 font-bold">
                  {
                    purchaseOrder
                      .supplier.name
                  }
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-gray-500">
                  Sipariş Tarihi
                </p>

                <p className="mt-2 font-semibold">
                  {formatDate(
                    purchaseOrder.orderDate
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-gray-500">
                  Beklenen Teslim
                </p>

                <p className="mt-2 font-semibold">
                  {formatDate(
                    purchaseOrder.expectedDate
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-gray-500">
                  Vade
                </p>

                <p className="mt-2 font-semibold">
                  {
                    purchaseOrder
                      .paymentTermDays
                  }{" "}
                  gün
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-gray-500">
                  Tedarikçi İskontosu
                </p>

                <p className="mt-2 font-semibold">
                  %
                  {
                    purchaseOrder
                      .discountRate
                  }
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-gray-500">
                  Ürün Satırı
                </p>

                <p className="mt-2 font-semibold">
                  {
                    purchaseOrder.items
                      .length
                  }
                </p>
              </div>
            </div>
          </section>

          <section className="overflow-x-auto rounded-2xl bg-white shadow">
            <div className="border-b p-6">
              <h2 className="text-2xl font-bold">
                Satın Alma Ürünleri
              </h2>
            </div>

            <table className="w-full min-w-[1250px] text-left">
              <thead className="bg-blue-900 text-white">
                <tr>
                  <th className="p-4">
                    Ürün Kodu
                  </th>

                  <th className="p-4">
                    Ürün
                  </th>

                  <th className="p-4">
                    Miktar
                  </th>

                  <th className="p-4">
                    Kabul
                  </th>

                  <th className="p-4">
                    Birim Fiyat
                  </th>

                  <th className="p-4">
                    KDV
                  </th>

                  <th className="p-4">
                    KDV Hariç Net
                  </th>

                  <th className="p-4">
                    KDV Tutarı
                  </th>

                  <th className="p-4">
                    Satır Toplamı
                  </th>

                  <th className="p-4">
                    İşlem
                  </th>
                </tr>
              </thead>

              <tbody>
                {purchaseOrder.items.map(
                  (item) => (
                    <tr
                      key={item.id}
                      className="border-b hover:bg-slate-50"
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

                      <td className="whitespace-nowrap p-4">
                        {formatCurrency(
                          item.unitPrice
                        )}{" "}
                        ₺
                      </td>

                      <td className="p-4">
                        %{item.vatRate}
                      </td>

                      <td className="whitespace-nowrap p-4">
                        {formatCurrency(
                          item.lineNet
                        )}{" "}
                        ₺
                      </td>

                      <td className="whitespace-nowrap p-4">
                        {formatCurrency(
                          item.vatAmount
                        )}{" "}
                        ₺
                      </td>

                      <td className="whitespace-nowrap p-4 font-bold">
                        {formatCurrency(
                          item.lineTotal
                        )}{" "}
                        ₺
                      </td>

<td className="p-4">
  {isEditable &&
  item.receivedQuantity === 0 ? (
    <div className="space-y-3">
      <PurchaseOrderItemEditForm
        purchaseOrderId={
          purchaseOrder.id
        }
        purchaseOrderItemId={
          item.id
        }
        productName={
          item.productName
        }
        initialOrderedQuantity={
          item.orderedQuantity
        }
        initialUnitPrice={
          item.unitPrice
        }
      />

      <form
        action={deletePurchaseOrderItem.bind(
          null,
          purchaseOrder.id,
          item.id
        )}
      >
        <button
          type="submit"
          className="w-full rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
        >
          Sil
        </button>
      </form>
    </div>
  ) : (
    <span className="text-gray-400">
      -
    </span>
  )}
</td>
                    </tr>
                  )
                )}

                {purchaseOrder.items.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="p-12 text-center text-gray-500"
                    >
                      Henüz ürün satırı
                      eklenmedi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-2xl font-bold">
              Notlar
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-gray-500">
                  Tedarikçiye Not
                </p>

                <p className="mt-3 whitespace-pre-wrap">
                  {purchaseOrder.supplierNote ||
                    "Not bulunmuyor."}
                </p>
              </div>

              <div className="rounded-xl bg-yellow-50 p-5">
                <p className="text-sm font-semibold text-yellow-700">
                  İç Operasyon Notu
                </p>

                <p className="mt-3 whitespace-pre-wrap">
                  {purchaseOrder.internalNote ||
                    "Not bulunmuyor."}
                </p>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
            <PurchaseOrderStatusActions
  purchaseOrderId={purchaseOrder.id}
  status={purchaseOrder.status}
  itemCount={purchaseOrder.items.length}
  hasReceivedQuantity={hasReceivedQuantity}
/>
          {isEditable ? (
            <PurchaseOrderItemForm
              purchaseOrderId={
                purchaseOrder.id
              }
              products={products}
            />
          ) : (
            <div className="rounded-2xl bg-orange-50 p-6 text-orange-800">
              Bu satın alma artık Taslak
              durumda olmadığı için ürün
              satırları değiştirilemez.
            </div>
          )}

          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-2xl font-bold">
              Finansal Özet
            </h2>

            <div className="mt-7 space-y-5">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">
                  Brüt Ara Toplam
                </span>

                <strong>
                  {formatCurrency(
                    purchaseOrder.subtotal
                  )}{" "}
                  ₺
                </strong>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">
                  İskonto (%
                  {
                    purchaseOrder
                      .discountRate
                  }
                  )
                </span>

                <strong className="text-red-600">
                  -
                  {formatCurrency(
                    purchaseOrder.discountAmount
                  )}{" "}
                  ₺
                </strong>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">
                  Toplam KDV
                </span>

                <strong>
                  {formatCurrency(
                    purchaseOrder.vatAmount
                  )}{" "}
                  ₺
                </strong>
              </div>

              <div className="border-t pt-5">
                <div className="flex justify-between gap-4">
                  <span className="text-lg font-bold">
                    Genel Toplam
                  </span>

                  <strong className="text-2xl text-blue-900">
                    {formatCurrency(
                      purchaseOrder.totalAmount
                    )}{" "}
                    ₺
                  </strong>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import PrintButton from "@/components/admin/PrintButton";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function formatCurrency(value: number) {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Belirtilmedi";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Taslak",
    PENDING: "Bekliyor",
    APPROVED: "Onaylandı",
    PARTIALLY_RECEIVED: "Kısmi Mal Kabul",
    RECEIVED: "Tamamlandı",
    CANCELLED: "İptal",
  };

  return labels[status] ?? status;
}

function getSupplierLocation({
  city,
  district,
  postalCode,
}: {
  city: string | null;
  district: string | null;
  postalCode: string | null;
}) {
  const locationParts: string[] = [];

  if (district) {
    locationParts.push(district);
  }

  if (city) {
    locationParts.push(city);
  }

  const location = locationParts.join(" / ");

  if (postalCode && location) {
    return `${postalCode} ${location}`;
  }

  if (postalCode) {
    return postalCode;
  }

  return location || "-";
}

export default async function PurchaseOrderPrintPage({
  params,
}: Props) {
  const { id } = await params;
  const purchaseOrderId = Number(id);

  if (
    !Number.isInteger(purchaseOrderId) ||
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
        supplier: true,

        items: {
          orderBy: {
            id: "asc",
          },
        },
      },
    });

  if (!purchaseOrder) {
    notFound();
  }

  const totalOrderedQuantity =
    purchaseOrder.items.reduce(
      (total, item) =>
        total + item.orderedQuantity,
      0
    );

  const totalReceivedQuantity =
    purchaseOrder.items.reduce(
      (total, item) =>
        total + item.receivedQuantity,
      0
    );

  const supplierLocation =
    getSupplierLocation({
      city: purchaseOrder.supplier.city,
      district:
        purchaseOrder.supplier.district,
      postalCode:
        purchaseOrder.supplier.postalCode,
    });

  return (
    <main className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-6xl flex-wrap justify-between gap-3 print:hidden">
        <Link
          href={`/admin/purchase-orders/${purchaseOrder.id}`}
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
        >
          ← Satın Alma Detayına Dön
        </Link>

        <PrintButton />
      </div>

      <section className="mx-auto max-w-6xl bg-white p-10 shadow print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-8 border-b-2 border-slate-900 pb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-wide">
              ETKEN
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Etken Ofis Tedarik Hizmetleri Ltd. Şti.
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Kurumsal Tedarik Platformu
            </p>
          </div>

          <div className="text-right">
            <h2 className="text-3xl font-bold">
              SATIN ALMA SİPARİŞİ
            </h2>

            <p className="mt-3 text-xl font-bold text-blue-900">
              {purchaseOrder.purchaseNumber}
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Durum:{" "}
              <strong className="text-slate-900">
                {getStatusLabel(
                  purchaseOrder.status
                )}
              </strong>
            </p>
          </div>
        </header>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="rounded-xl border p-5">
            <h3 className="text-lg font-bold">
              Tedarikçi Bilgileri
            </h3>

            <div className="mt-4 space-y-2 text-sm">
              <p>
                <strong>Firma:</strong>{" "}
                {purchaseOrder.supplier.name}
              </p>

              <p>
                <strong>Yetkili:</strong>{" "}
                {purchaseOrder.supplier
                  .contactName || "-"}
              </p>

              <p>
                <strong>Telefon:</strong>{" "}
                {purchaseOrder.supplier.phone ||
                  "-"}
              </p>

              <p>
                <strong>E-posta:</strong>{" "}
                {purchaseOrder.supplier.email ||
                  "-"}
              </p>

              <p>
                <strong>Vergi Dairesi:</strong>{" "}
                {purchaseOrder.supplier
                  .taxOffice || "-"}
              </p>

              <p>
                <strong>Vergi Numarası:</strong>{" "}
                {purchaseOrder.supplier
                  .taxNumber || "-"}
              </p>

              <p>
                <strong>Açık Adres:</strong>{" "}
                {purchaseOrder.supplier.address ||
                  "-"}
              </p>

              <p>
                <strong>İl / İlçe:</strong>{" "}
                {supplierLocation}
              </p>
            </div>
          </section>

          <section className="rounded-xl border p-5">
            <h3 className="text-lg font-bold">
              Sipariş Bilgileri
            </h3>

            <div className="mt-4 space-y-2 text-sm">
              <p>
                <strong>Sipariş Tarihi:</strong>{" "}
                {formatDate(
                  purchaseOrder.orderDate
                )}
              </p>

              <p>
                <strong>
                  Beklenen Teslim:
                </strong>{" "}
                {formatDate(
                  purchaseOrder.expectedDate
                )}
              </p>

              <p>
                <strong>Vade:</strong>{" "}
                {
                  purchaseOrder.paymentTermDays
                }{" "}
                gün
              </p>

              <p>
                <strong>
                  Tedarikçi İskontosu:
                </strong>{" "}
                %
                {purchaseOrder.discountRate}
              </p>

              <p>
                <strong>Toplam Miktar:</strong>{" "}
                {formatNumber(
                  totalOrderedQuantity
                )}
              </p>

              <p>
                <strong>Kabul Edilen:</strong>{" "}
                {formatNumber(
                  totalReceivedQuantity
                )}
              </p>
            </div>
          </section>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="p-3">Sıra</th>
                <th className="p-3">
                  Ürün Kodu
                </th>
                <th className="p-3">
                  Ürün Adı
                </th>
                <th className="p-3 text-right">
                  Miktar
                </th>
                <th className="p-3 text-right">
                  Birim Fiyat
                </th>
                <th className="p-3 text-right">
                  KDV
                </th>
                <th className="p-3 text-right">
                  KDV Hariç Net
                </th>
                <th className="p-3 text-right">
                  Satır Toplamı
                </th>
              </tr>
            </thead>

            <tbody>
              {purchaseOrder.items.map(
                (item, index) => (
                  <tr
                    key={item.id}
                    className="border-b"
                  >
                    <td className="p-3">
                      {index + 1}
                    </td>

                    <td className="p-3 font-semibold">
                      {item.productCode}
                    </td>

                    <td className="p-3">
                      {item.productName}
                    </td>

                    <td className="p-3 text-right">
                      {formatNumber(
                        item.orderedQuantity
                      )}
                    </td>

                    <td className="p-3 text-right">
                      {formatCurrency(
                        item.unitPrice
                      )}{" "}
                      ₺
                    </td>

                    <td className="p-3 text-right">
                      %{item.vatRate}
                    </td>

                    <td className="p-3 text-right">
                      {formatCurrency(
                        item.lineNet
                      )}{" "}
                      ₺
                    </td>

                    <td className="p-3 text-right font-bold">
                      {formatCurrency(
                        item.lineTotal
                      )}{" "}
                      ₺
                    </td>
                  </tr>
                )
              )}

              {purchaseOrder.items.length ===
                0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center text-gray-500"
                  >
                    Ürün satırı bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex justify-end">
          <div className="w-full max-w-md rounded-xl border p-5">
            <div className="flex justify-between gap-4 py-2">
              <span>Brüt Ara Toplam</span>

              <strong>
                {formatCurrency(
                  purchaseOrder.subtotal
                )}{" "}
                ₺
              </strong>
            </div>

            <div className="flex justify-between gap-4 py-2">
              <span>
                İskonto (%
                {purchaseOrder.discountRate})
              </span>

              <strong>
                -
                {formatCurrency(
                  purchaseOrder.discountAmount
                )}{" "}
                ₺
              </strong>
            </div>

            <div className="flex justify-between gap-4 py-2">
              <span>Toplam KDV</span>

              <strong>
                {formatCurrency(
                  purchaseOrder.vatAmount
                )}{" "}
                ₺
              </strong>
            </div>

            <div className="mt-3 flex justify-between gap-4 border-t-2 border-slate-900 pt-4 text-lg">
              <span className="font-bold">
                Genel Toplam
              </span>

              <strong className="text-blue-900">
                {formatCurrency(
                  purchaseOrder.totalAmount
                )}{" "}
                ₺
              </strong>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="rounded-xl border p-5">
            <h3 className="font-bold">
              Tedarikçiye Not
            </h3>

            <p className="mt-3 min-h-20 whitespace-pre-wrap text-sm text-gray-600">
              {purchaseOrder.supplierNote ||
                "Not bulunmuyor."}
            </p>
          </section>

          <section className="rounded-xl border p-5">
            <h3 className="font-bold">
              İç Operasyon Notu
            </h3>

            <p className="mt-3 min-h-20 whitespace-pre-wrap text-sm text-gray-600">
              {purchaseOrder.internalNote ||
                "Not bulunmuyor."}
            </p>
          </section>
        </div>

        <div className="mt-14 grid grid-cols-3 gap-10 text-center text-sm">
          <div>
            <div className="h-20 border-b" />

            <p className="mt-3 font-semibold">
              Hazırlayan
            </p>
          </div>

          <div>
            <div className="h-20 border-b" />

            <p className="mt-3 font-semibold">
              Onaylayan
            </p>
          </div>

          <div>
            <div className="h-20 border-b" />

            <p className="mt-3 font-semibold">
              Tedarikçi
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

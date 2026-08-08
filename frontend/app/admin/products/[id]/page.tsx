import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

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

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function getMovementLabel(type: string) {
  const labels: Record<string, string> = {
    INITIAL_STOCK: "Açılış Stoğu",
    PURCHASE_RECEIPT: "Mal Kabul",
    MANUAL_IN: "Manuel Stok Girişi",
    MANUAL_OUT: "Manuel Stok Çıkışı",
    RESERVATION_CREATE: "Rezervasyon Oluşturma",
    RESERVATION_RELEASE: "Rezervasyon Çözme",
    SALE_SHIPMENT: "Satış Sevkiyatı",
    SALE_RETURN: "Satış İadesi",
    COUNT_INCREASE: "Sayım Fazlası",
    COUNT_DECREASE: "Sayım Eksiği",
    TRANSFER_IN: "Transfer Girişi",
    TRANSFER_OUT: "Transfer Çıkışı",
  };

  return labels[type] ?? type;
}

function getMovementClass(type: string) {
  const classes: Record<string, string> = {
    INITIAL_STOCK: "bg-slate-100 text-slate-700",
    PURCHASE_RECEIPT: "bg-green-100 text-green-700",
    MANUAL_IN: "bg-green-100 text-green-700",
    MANUAL_OUT: "bg-red-100 text-red-700",
    RESERVATION_CREATE: "bg-orange-100 text-orange-700",
    RESERVATION_RELEASE: "bg-blue-100 text-blue-700",
    SALE_SHIPMENT: "bg-red-100 text-red-700",
    SALE_RETURN: "bg-green-100 text-green-700",
    COUNT_INCREASE: "bg-emerald-100 text-emerald-700",
    COUNT_DECREASE: "bg-rose-100 text-rose-700",
    TRANSFER_IN: "bg-cyan-100 text-cyan-700",
    TRANSFER_OUT: "bg-violet-100 text-violet-700",
  };

  return classes[type] ?? "bg-slate-100 text-slate-700";
}

function getOrderStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Taslak",
    PENDING: "Bekliyor",
    APPROVED: "Onaylandı",
    PREPARING: "Hazırlanıyor",
    PICKING: "Toplanıyor",
    PACKING: "Paketleniyor",
    READY_TO_SHIP: "Sevke Hazır",
    SHIPPED: "Sevk Edildi",
    DELIVERED: "Teslim Edildi",
    CANCELLED: "İptal",
  };

  return labels[status] ?? status;
}

function getOrderStatusClass(status: string) {
  const classes: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700",
    PENDING: "bg-orange-100 text-orange-700",
    APPROVED: "bg-blue-100 text-blue-700",
    PREPARING: "bg-violet-100 text-violet-700",
    PICKING: "bg-indigo-100 text-indigo-700",
    PACKING: "bg-cyan-100 text-cyan-700",
    READY_TO_SHIP: "bg-teal-100 text-teal-700",
    SHIPPED: "bg-sky-100 text-sky-700",
    DELIVERED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  return classes[status] ?? "bg-slate-100 text-slate-700";
}

function formatSignedNumber(value: number) {
  if (value > 0) {
    return `+${formatNumber(value)}`;
  }

  return formatNumber(value);
}

export default async function AdminProductDetailPage({
  params,
}: Props) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isInteger(productId) || productId <= 0) {
    notFound();
  }

  const [product, stockMovements, recentOrderItems] =
    await Promise.all([
      prisma.product.findUnique({
        where: {
          id: productId,
        },

        include: {
          productBarcodes: {
            include: {
              evidences: {
                orderBy: {
                  firstSeenAt: "asc",
                },
              },
            },

            orderBy: [
              {
                isVerified: "desc",
              },
              {
                isPrimary: "desc",
              },
              {
                id: "asc",
              },
            ],
          },

          productImageSources: {
            orderBy: [
              {
                isVerified: "desc",
              },
              {
                isPrimary: "desc",
              },
              {
                sortOrder: "asc",
              },
              {
                id: "asc",
              },
            ],
          },
        },
      }),

      prisma.stockMovement.findMany({
        where: {
          productId,
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 50,

        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
            },
          },
        },
      }),

      prisma.orderItem.findMany({
        where: {
          productId,
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 10,

        include: {
          order: {
            include: {
              customer: {
                select: {
                  customerCode: true,
                  companyName: true,
                },
              },
            },
          },
        },
      }),
    ]);

  if (!product) {
    notFound();
  }

  const availableStock =
    product.stock - product.reservedStock;

  const totalPhysicalIn = stockMovements.reduce(
    (total, movement) =>
      movement.physicalChange > 0
        ? total + movement.physicalChange
        : total,
    0
  );

  const totalPhysicalOut = stockMovements.reduce(
    (total, movement) =>
      movement.physicalChange < 0
        ? total + Math.abs(movement.physicalChange)
        : total,
    0
  );

  const primaryBarcode =
    product.productBarcodes.find(
      (barcode) => barcode.isPrimary,
    ) ??
    product.productBarcodes.find(
      (barcode) => barcode.isVerified,
    ) ??
    product.productBarcodes[0] ??
    null;

  const primaryImage =
    product.productImageSources.find(
      (image) =>
        image.isPrimary &&
        image.isVerified,
    ) ??
    product.productImageSources.find(
      (image) => image.isPrimary,
    ) ??
    product.productImageSources.find(
      (image) => image.isVerified,
    ) ??
    product.productImageSources[0] ??
    null;

  const primaryImageUrl =
    primaryImage?.storageUrl ??
    primaryImage?.sourceUrl ??
    product.imageUrl ??
    null;

  const hasMasterBarcode =
    product.productBarcodes.length > 0;

  const hasProductImage =
    product.productImageSources.length > 0 ||
    Boolean(product.imageUrl);

  const masterDataComplete =
    hasMasterBarcode && hasProductImage;

  return (
    <section className="p-10">
      {/* BAŞLIK */}

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-bold">
              Ürün Detayı
            </h1>

            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                product.isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {product.isActive ? "Aktif" : "Pasif"}
            </span>
          </div>

          <p className="mt-3 text-lg font-bold text-blue-900">
            {product.code}
          </p>

          <p className="mt-1 text-gray-500">
            Ürün kartı, stok durumu ve hareket geçmişi
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/products/${product.id}/edit`}
            className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800"
          >
            ✏️ Ürünü Düzenle
          </Link>

          <Link
            href={`/products/${product.code}`}
            className="rounded-xl border border-blue-900 bg-white px-5 py-3 font-semibold text-blue-900 hover:bg-blue-50"
          >
            Site Ürün Sayfası
          </Link>

          <Link
            href="/admin/products"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
          >
            ← Ürün Listesine Dön
          </Link>
        </div>
      </div>

      {/* ÜRÜN VE STOK ÖZETİ */}

      <div className="mt-10 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-2xl font-bold">
            Ürün Bilgileri
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-gray-500">
                Ürün Adı
              </p>

              <p className="mt-2 font-bold">
                {product.name}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-gray-500">
                Geçici / Eski Barkod
              </p>

              <p className="mt-2 font-bold">
                {product.barcode}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-gray-500">
                Marka
              </p>

              <p className="mt-2 font-semibold">
                {product.brand}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-gray-500">
                Kategori
              </p>

              <p className="mt-2 font-semibold">
                {product.category}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-gray-500">
                Tedarikçi
              </p>

              <p className="mt-2 font-semibold">
                {product.supplier}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-gray-500">
                Stok Kaynağı
              </p>

              <p className="mt-2 font-semibold">
                {product.ownStock
                  ? "ETKEN Deposu"
                  : "Tedarikçi Stoğu"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-gray-500">
                KDV Hariç Satış Fiyatı
              </p>

              <p className="mt-2 text-xl font-bold text-blue-900">
                {formatCurrency(product.price)} ₺
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-gray-500">
                KDV Oranı
              </p>

              <p className="mt-2 text-xl font-bold">
                %{product.vat}
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-2xl font-bold">
            Stok Özeti
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl bg-blue-50 p-6 text-center">
              <p className="text-sm font-semibold uppercase text-blue-700">
                Fiziksel
              </p>

              <p className="mt-3 text-4xl font-bold text-blue-900">
                {formatNumber(product.stock)}
              </p>
            </div>

            <div className="rounded-2xl bg-orange-50 p-6 text-center">
              <p className="text-sm font-semibold uppercase text-orange-700">
                Rezerve
              </p>

              <p className="mt-3 text-4xl font-bold text-orange-700">
                {formatNumber(product.reservedStock)}
              </p>
            </div>

            <div
              className={`rounded-2xl p-6 text-center ${
                availableStock <= 0
                  ? "bg-red-50"
                  : availableStock <= 20
                    ? "bg-orange-50"
                    : "bg-green-50"
              }`}
            >
              <p
                className={`text-sm font-semibold uppercase ${
                  availableStock <= 0
                    ? "text-red-700"
                    : availableStock <= 20
                      ? "text-orange-700"
                      : "text-green-700"
                }`}
              >
                Kullanılabilir
              </p>

              <p
                className={`mt-3 text-4xl font-bold ${
                  availableStock <= 0
                    ? "text-red-700"
                    : availableStock <= 20
                      ? "text-orange-700"
                      : "text-green-700"
                }`}
              >
                {formatNumber(availableStock)}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border p-4">
              <p className="text-sm text-gray-500">
                Gösterilen Hareket
              </p>

              <p className="mt-2 text-2xl font-bold">
                {formatNumber(stockMovements.length)}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-gray-500">
                Toplam Fiziksel Giriş
              </p>

              <p className="mt-2 text-2xl font-bold text-green-700">
                +{formatNumber(totalPhysicalIn)}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-gray-500">
                Toplam Fiziksel Çıkış
              </p>

              <p className="mt-2 text-2xl font-bold text-red-700">
                -{formatNumber(totalPhysicalOut)}
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs text-gray-400">
            Giriş ve çıkış toplamları ekranda gösterilen son 50
            stok hareketine göre hesaplanır.
          </p>
        </article>
      </div>

      {/* ÜRÜN MASTER VERİLERİ */}

      <section className="mt-8 rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              Ürün Master Verileri
            </h2>

            <p className="mt-2 text-gray-500">
              Üretici barkodları, doğrulama kaynakları ve
              rakip/tedarikçi sitelerinden bulunan ürün görselleri.
            </p>
          </div>

          <span
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              masterDataComplete
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {masterDataComplete
              ? "✓ Veri Tam"
              : "Veri Eksik"}
          </span>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[360px_1fr]">
          <article className="rounded-2xl border border-slate-200 p-5">
            <h3 className="text-lg font-bold">
              Ana Görsel
            </h3>

            <div className="mt-4 flex min-h-72 items-center justify-center rounded-2xl bg-slate-50 p-4">
              {primaryImageUrl ? (
                <img
                  src={primaryImageUrl}
                  alt={product.name}
                  className="max-h-64 w-full object-contain"
                />
              ) : (
                <div className="text-center text-sm font-semibold text-slate-400">
                  Ürün görseli bulunmuyor.
                </div>
              )}
            </div>

            {primaryImage && (
              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <span className="font-semibold text-slate-700">
                    Kaynak:
                  </span>{" "}
                  {primaryImage.sourceSite ??
                    primaryImage.sourceType}
                </p>

                <p>
                  <span className="font-semibold text-slate-700">
                    Doğrulama:
                  </span>{" "}
                  {primaryImage.isVerified
                    ? "Doğrulandı"
                    : "Bekliyor"}
                </p>

                {primaryImage.sourcePageUrl && (
                  <a
                    href={primaryImage.sourcePageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block font-bold text-blue-700 hover:underline"
                  >
                    Kaynak ürün sayfasını aç
                  </a>
                )}
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-slate-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">
                  Üretici Barkodları
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Aynı barkod farklı güvenilir kaynaklarda
                  doğrulanırsa otomatik doğrulanmış kabul edilir.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
                {product.productBarcodes.length} barkod
              </span>
            </div>

            {product.productBarcodes.length > 0 ? (
              <div className="mt-5 grid gap-4">
                {product.productBarcodes.map((barcode) => (
                  <div
                    key={barcode.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-mono text-xl font-black text-slate-950">
                          {barcode.barcode}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                            {barcode.barcodeType}
                          </span>

                          {barcode.isPrimary && (
                            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                              Ana Barkod
                            </span>
                          )}

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              barcode.isVerified
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {barcode.isVerified
                              ? "✓ Doğrulandı"
                              : "Doğrulama Bekliyor"}
                          </span>
                        </div>
                      </div>

                      <div className="text-right text-sm text-slate-500">
                        <p className="font-semibold text-slate-700">
                          {barcode.verificationCount} bağımsız kaynak
                        </p>

                        {barcode.verifiedAt && (
                          <p className="mt-1">
                            {formatDate(barcode.verifiedAt)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Kaynak Kanıtları
                      </p>

                      {barcode.evidences.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {barcode.evidences.map(
                            (evidence) => (
                              <a
                                key={evidence.id}
                                href={
                                  evidence.sourcePageUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                              >
                                {evidence.sourceSite}
                              </a>
                            ),
                          )}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-slate-400">
                          Kaynak kanıtı bulunmuyor.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
                Gerçek üretici barkodu henüz bulunamadı.
              </div>
            )}

            <div className="mt-5 rounded-xl bg-slate-100 p-4 text-sm">
              <p className="font-semibold text-slate-700">
                Geçici / eski barkod
              </p>

              <p className="mt-1 font-mono font-bold text-slate-900">
                {product.barcode}
              </p>
            </div>
          </article>
        </div>

        <article className="mt-6 rounded-2xl border border-slate-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">
                Ürün Görsel Galerisi
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Kaynak sitelerden bulunan görseller.
                Cloud Storage aktarımı tamamlandığında
                storage URL öncelikli kullanılacaktır.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
              {product.productImageSources.length} görsel
            </span>
          </div>

          {product.productImageSources.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {product.productImageSources.map(
                (image) => {
                  const imageUrl =
                    image.storageUrl ??
                    image.sourceUrl;

                  return (
                    <div
                      key={image.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                    >
                      <div className="flex h-52 items-center justify-center bg-slate-50 p-3">
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="max-h-full w-full object-contain"
                        />
                      </div>

                      <div className="border-t p-3">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">
                            {image.sourceSite ??
                              image.sourceType}
                          </span>

                          {image.isPrimary && (
                            <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-bold text-violet-700">
                              Ana
                            </span>
                          )}

                          <span
                            className={`rounded-full px-2 py-1 text-xs font-bold ${
                              image.isVerified
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {image.isVerified
                              ? "Doğrulandı"
                              : "Bekliyor"}
                          </span>
                        </div>

                        {image.storageUrl ? (
                          <p className="mt-3 text-xs font-semibold text-green-700">
                            Cloud Storage
                          </p>
                        ) : (
                          <p className="mt-3 text-xs text-slate-500">
                            Harici kaynak
                          </p>
                        )}

                        {image.sourcePageUrl && (
                          <a
                            href={image.sourcePageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block text-xs font-bold text-blue-700 hover:underline"
                          >
                            Kaynağı aç
                          </a>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-violet-200 bg-violet-50 p-5 text-sm font-semibold text-violet-700">
              Ürün görseli henüz bulunamadı.
            </div>
          )}
        </article>
      </section>

      {/* STOK HAREKETLERİ */}

      <section className="mt-8 overflow-x-auto rounded-2xl bg-white shadow">
        <div className="border-b p-6">
          <h2 className="text-2xl font-bold">
            Stok Hareket Geçmişi
          </h2>

          <p className="mt-2 text-gray-500">
            Ürüne ait en son 50 fiziksel stok ve rezervasyon
            hareketi.
          </p>
        </div>

        <table className="w-full min-w-[1550px] text-left">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="p-4">Tarih</th>
              <th className="p-4">Hareket Tipi</th>
              <th className="p-4">Belge No</th>
              <th className="p-4">Fiziksel Değişim</th>
              <th className="p-4">Rezervasyon Değişimi</th>
              <th className="p-4">Fiziksel Bakiye</th>
              <th className="p-4">Rezerve Bakiye</th>
              <th className="p-4">Kullanılabilir</th>
              <th className="p-4">Açıklama</th>
              <th className="p-4">İşlem</th>
            </tr>
          </thead>

          <tbody>
            {stockMovements.map((movement) => (
              <tr
                key={movement.id}
                className="border-b hover:bg-slate-50"
              >
                <td className="whitespace-nowrap p-4">
                  {formatDate(movement.createdAt)}
                </td>

                <td className="p-4">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${getMovementClass(
                      movement.movementType
                    )}`}
                  >
                    {getMovementLabel(
                      movement.movementType
                    )}
                  </span>
                </td>

                <td className="p-4">
                  <p className="font-semibold">
                    {movement.documentNumber || "-"}
                  </p>

                  {movement.order && (
                    <p className="mt-1 text-sm text-gray-500">
                      Sipariş bağlantılı
                    </p>
                  )}
                </td>

                <td className="p-4">
                  <span
                    className={`font-bold ${
                      movement.physicalChange > 0
                        ? "text-green-700"
                        : movement.physicalChange < 0
                          ? "text-red-700"
                          : "text-gray-400"
                    }`}
                  >
                    {formatSignedNumber(
                      movement.physicalChange
                    )}
                  </span>
                </td>

                <td className="p-4">
                  <span
                    className={`font-bold ${
                      movement.reservedChange > 0
                        ? "text-orange-700"
                        : movement.reservedChange < 0
                          ? "text-blue-700"
                          : "text-gray-400"
                    }`}
                  >
                    {formatSignedNumber(
                      movement.reservedChange
                    )}
                  </span>
                </td>

                <td className="p-4 font-semibold">
                  {formatNumber(
                    movement.physicalBalanceAfter
                  )}
                </td>

                <td className="p-4 font-semibold">
                  {formatNumber(
                    movement.reservedBalanceAfter
                  )}
                </td>

                <td className="p-4 font-bold text-green-700">
                  {formatNumber(
                    movement.availableBalanceAfter
                  )}
                </td>

                <td className="max-w-80 p-4">
                  {movement.description || "-"}
                </td>

                <td className="p-4">
                  {movement.order ? (
                    <Link
                      href={`/admin/orders/${movement.order.id}`}
                      className="rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700"
                    >
                      Siparişi Aç
                    </Link>
                  ) : (
                    <span className="text-gray-400">
                      -
                    </span>
                  )}
                </td>
              </tr>
            ))}

            {stockMovements.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="p-10 text-center text-gray-500"
                >
                  Bu ürüne ait stok hareketi henüz bulunmuyor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* SON SİPARİŞLER */}

      <section className="mt-8 overflow-x-auto rounded-2xl bg-white shadow">
        <div className="border-b p-6">
          <h2 className="text-2xl font-bold">
            Ürünün Yer Aldığı Son Siparişler
          </h2>

          <p className="mt-2 text-gray-500">
            Bu ürünü içeren son 10 sipariş satırı.
          </p>
        </div>

        <table className="w-full min-w-[1150px] text-left">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="p-4">Sipariş No</th>
              <th className="p-4">Müşteri</th>
              <th className="p-4">Miktar</th>
              <th className="p-4">Birim Fiyat</th>
              <th className="p-4">Satır Toplamı</th>
              <th className="p-4">Durum</th>
              <th className="p-4">Tarih</th>
              <th className="p-4">İşlem</th>
            </tr>
          </thead>

          <tbody>
            {recentOrderItems.map((item) => (
              <tr
                key={item.id}
                className="border-b hover:bg-slate-50"
              >
                <td className="p-4 font-bold text-blue-900">
                  {item.order.orderNumber}
                </td>

                <td className="p-4">
                  <p className="font-semibold">
                    {item.order.customer.companyName}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {item.order.customer.customerCode}
                  </p>
                </td>

                <td className="p-4 font-bold">
                  {formatNumber(item.quantity)}
                </td>

                <td className="whitespace-nowrap p-4">
                  {formatCurrency(item.unitPrice)} ₺
                </td>

                <td className="whitespace-nowrap p-4 font-bold">
                  {formatCurrency(item.lineTotal)} ₺
                </td>

                <td className="p-4">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${getOrderStatusClass(
                      item.order.status
                    )}`}
                  >
                    {getOrderStatusLabel(
                      item.order.status
                    )}
                  </span>
                </td>

                <td className="whitespace-nowrap p-4">
                  {formatDate(item.order.orderDate)}
                </td>

                <td className="p-4">
                  <Link
                    href={`/admin/orders/${item.order.id}`}
                    className="rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white hover:bg-blue-800"
                  >
                    Siparişi Aç
                  </Link>
                </td>
              </tr>
            ))}

            {recentOrderItems.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="p-10 text-center text-gray-500"
                >
                  Bu ürün henüz herhangi bir siparişte
                  kullanılmamış.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </section>
  );
}
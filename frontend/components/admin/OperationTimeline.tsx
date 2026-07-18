import {
  Prisma,
  WmsOperationType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

type Props = {
  handlingUnitId?: number;
  handlingUnitBarcode?: string;
  orderId?: number;
  orderNumber?: string;
  title?: string;
  description?: string;
  limit?: number;
};

function getOperationLabel(
  operationType: WmsOperationType
) {
  const labels: Record<
    WmsOperationType,
    string
  > = {
    RECEIVING: "Mal Kabul",
    HANDLING_UNIT_CREATE:
      "THM Oluşturma",
    HANDLING_UNIT_UPDATE:
      "THM Güncelleme",
    HANDLING_UNIT_CANCEL:
      "THM İptali",
    ADDRESSING: "Adresleme",
    UNADDRESSING:
      "Adresten Çıkarma",
    ITEM_TRANSFER:
      "Ürün Transferi",
    FULL_TRANSFER:
      "Komple THM Transferi",
    PALLET_LINK:
      "Koli-Palet Bağlama",
    PALLET_UNLINK:
      "Paletten Koli Ayırma",
    PICKING: "Sipariş Toplama",
    PACKING: "Paketleme",
    SHIPPING: "Sevkiyat",
    COUNT: "Sayım",
    STOCK_IN: "Stok Girişi",
    STOCK_OUT: "Stok Çıkışı",
    OTHER: "Diğer İşlem",
  };

  return labels[operationType];
}

function getOperationBadgeClass(
  operationType: WmsOperationType
) {
  const classes: Partial<
    Record<WmsOperationType, string>
  > = {
    RECEIVING:
      "bg-emerald-100 text-emerald-700",
    ADDRESSING:
      "bg-blue-100 text-blue-700",
    UNADDRESSING:
      "bg-slate-100 text-slate-700",
    ITEM_TRANSFER:
      "bg-violet-100 text-violet-700",
    FULL_TRANSFER:
      "bg-purple-100 text-purple-700",
    PALLET_LINK:
      "bg-cyan-100 text-cyan-700",
    PALLET_UNLINK:
      "bg-orange-100 text-orange-700",
    PICKING:
      "bg-amber-100 text-amber-700",
    PACKING:
      "bg-fuchsia-100 text-fuchsia-700",
    SHIPPING:
      "bg-green-100 text-green-700",
    COUNT:
      "bg-indigo-100 text-indigo-700",
    STOCK_IN:
      "bg-teal-100 text-teal-700",
    STOCK_OUT:
      "bg-red-100 text-red-700",
  };

  return (
    classes[operationType] ??
    "bg-slate-100 text-slate-700"
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle: "medium",
      timeStyle: "medium",
      timeZone: "Europe/Istanbul",
    }
  ).format(value);
}

function getBarcodeRole({
  handlingUnitBarcode,
  barcode,
  sourceBarcode,
  targetBarcode,
}: {
  handlingUnitBarcode?: string;
  barcode: string | null;
  sourceBarcode: string | null;
  targetBarcode: string | null;
}) {
  if (!handlingUnitBarcode) {
    return null;
  }

  if (
    sourceBarcode ===
    handlingUnitBarcode
  ) {
    return "Kaynak THM";
  }

  if (
    targetBarcode ===
    handlingUnitBarcode
  ) {
    return "Hedef THM";
  }

  if (
    barcode === handlingUnitBarcode
  ) {
    return "Ana THM";
  }

  return null;
}

function getDefaultDescription({
  handlingUnitBarcode,
  orderNumber,
}: {
  handlingUnitBarcode?: string;
  orderNumber?: string;
}) {
  if (handlingUnitBarcode) {
    return "Bu taşıma biriminin kayıt altına alınmış operasyon hareketleri gösterilir.";
  }

  if (orderNumber) {
    return "Bu siparişe ait toplama, paketleme, sevkiyat ve diğer WMS operasyon hareketleri gösterilir.";
  }

  return "Kayıt altına alınmış WMS operasyon hareketleri gösterilir.";
}

export default async function OperationTimeline({
  handlingUnitId,
  handlingUnitBarcode,
  orderId,
  orderNumber,
  title = "Operasyon Geçmişi",
  description,
  limit = 200,
}: Props) {
  const filters: Prisma.WmsOperationLogWhereInput[] =
    [];

  if (
    handlingUnitId !== undefined
  ) {
    filters.push({
      entityType: "HANDLING_UNIT",
      entityId: handlingUnitId,
    });
  }

  if (handlingUnitBarcode) {
    filters.push(
      {
        barcode:
          handlingUnitBarcode,
      },
      {
        sourceBarcode:
          handlingUnitBarcode,
      },
      {
        targetBarcode:
          handlingUnitBarcode,
      }
    );
  }

  if (orderId !== undefined) {
    filters.push({
      entityType: "ORDER",
      entityId: orderId,
    });
  }

  if (orderNumber) {
    filters.push({
      orderNumber,
    });
  }

  const operationLogs =
    filters.length > 0
      ? await prisma.wmsOperationLog.findMany(
          {
            where: {
              OR: filters,
            },

            orderBy: {
              createdAt: "desc",
            },

            take: Math.min(
              Math.max(limit, 1),
              500
            ),

            select: {
              id: true,
              operationType: true,
              module: true,
              operatorName: true,
              terminalCode: true,
              barcode: true,
              sourceBarcode: true,
              targetBarcode: true,
              orderNumber: true,
              purchaseNumber: true,
              productCode: true,
              productName: true,
              quantity: true,
              warehouseCode: true,
              sourceLocationCode: true,
              targetLocationCode: true,
              previousStatus: true,
              newStatus: true,
              description: true,
              isSuccessful: true,
              errorMessage: true,
              createdAt: true,
            },
          }
        )
      : [];

  return (
    <section className="mt-8 rounded-2xl bg-white p-6 shadow">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">
            {title}
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {description ??
              getDefaultDescription({
                handlingUnitBarcode,
                orderNumber,
              })}
          </p>
        </div>

        <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
          {operationLogs.length.toLocaleString(
            "tr-TR"
          )}{" "}
          hareket
        </div>
      </div>

      {operationLogs.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          Bu kayıt için henüz operasyon
          hareketi bulunmuyor.
        </div>
      ) : (
        <div className="relative mt-8 space-y-6">
          <div className="absolute bottom-4 left-[18px] top-4 w-px bg-slate-200" />

          {operationLogs.map((log) => {
            const barcodeRole =
              getBarcodeRole({
                handlingUnitBarcode,
                barcode: log.barcode,
                sourceBarcode:
                  log.sourceBarcode,
                targetBarcode:
                  log.targetBarcode,
              });

            return (
              <article
                key={log.id}
                className="relative pl-12"
              >
                <div
                  className={`absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white text-sm font-bold shadow ${
                    log.isSuccessful
                      ? "bg-green-600 text-white"
                      : "bg-red-600 text-white"
                  }`}
                >
                  {log.isSuccessful
                    ? "✓"
                    : "!"}
                </div>

                <div className="rounded-2xl border border-slate-200 p-5 hover:border-slate-300">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getOperationBadgeClass(
                            log.operationType
                          )}`}
                        >
                          {getOperationLabel(
                            log.operationType
                          )}
                        </span>

                        {barcodeRole && (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {barcodeRole}
                          </span>
                        )}

                        {!log.isSuccessful && (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                            Başarısız
                          </span>
                        )}
                      </div>

                      <p className="mt-3 font-semibold text-slate-900">
                        {log.description ||
                          `${getOperationLabel(
                            log.operationType
                          )} işlemi gerçekleştirildi.`}
                      </p>
                    </div>

                    <time className="whitespace-nowrap text-sm font-semibold text-slate-500">
                      {formatDate(
                        log.createdAt
                      )}
                    </time>
                  </div>

                  <div className="mt-5 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                    {log.orderNumber && (
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          Sipariş
                        </p>

                        <p className="mt-1 font-bold">
                          {log.orderNumber}
                        </p>
                      </div>
                    )}

                    {log.purchaseNumber && (
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          Satın Alma
                        </p>

                        <p className="mt-1 font-bold">
                          {
                            log.purchaseNumber
                          }
                        </p>
                      </div>
                    )}

                    {(log.productCode ||
                      log.productName) && (
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          Ürün
                        </p>

                        <p className="mt-1 font-bold">
                          {[
                            log.productCode,
                            log.productName,
                          ]
                            .filter(Boolean)
                            .join(" — ")}
                        </p>
                      </div>
                    )}

                    {log.quantity !== null && (
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          Miktar
                        </p>

                        <p className="mt-1 text-lg font-bold">
                          {log.quantity.toLocaleString(
                            "tr-TR"
                          )}
                        </p>
                      </div>
                    )}

                    {log.barcode && (
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          İşlem Barkodu
                        </p>

                        <p className="mt-1 break-all font-mono font-bold">
                          {log.barcode}
                        </p>
                      </div>
                    )}

                    {log.sourceBarcode && (
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          Kaynak THM
                        </p>

                        <p className="mt-1 break-all font-mono font-bold">
                          {
                            log.sourceBarcode
                          }
                        </p>
                      </div>
                    )}

                    {log.targetBarcode && (
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          Hedef THM
                        </p>

                        <p className="mt-1 break-all font-mono font-bold">
                          {
                            log.targetBarcode
                          }
                        </p>
                      </div>
                    )}

                    {log.sourceLocationCode && (
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          Kaynak Lokasyon
                        </p>

                        <p className="mt-1 font-mono font-bold">
                          {
                            log.sourceLocationCode
                          }
                        </p>
                      </div>
                    )}

                    {log.targetLocationCode && (
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          Hedef Lokasyon
                        </p>

                        <p className="mt-1 font-mono font-bold">
                          {
                            log.targetLocationCode
                          }
                        </p>
                      </div>
                    )}

                    {log.warehouseCode && (
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          Depo
                        </p>

                        <p className="mt-1 font-bold">
                          {
                            log.warehouseCode
                          }
                        </p>
                      </div>
                    )}

                    {log.previousStatus &&
                      log.newStatus && (
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase text-slate-500">
                            Durum Değişimi
                          </p>

                          <p className="mt-1 font-bold">
                            {
                              log.previousStatus
                            }{" "}
                            → {log.newStatus}
                          </p>
                        </div>
                      )}

                    {(log.operatorName ||
                      log.terminalCode) && (
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          Operatör / Terminal
                        </p>

                        <p className="mt-1 font-bold">
                          {[
                            log.operatorName,
                            log.terminalCode,
                          ]
                            .filter(Boolean)
                            .join(" — ")}
                        </p>
                      </div>
                    )}

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        Modül
                      </p>

                      <p className="mt-1 font-mono font-bold">
                        {log.module}
                      </p>
                    </div>
                  </div>

                  {!log.isSuccessful &&
                    log.errorMessage && (
                      <div className="mt-4 rounded-xl bg-red-50 p-4 font-semibold text-red-700">
                        {log.errorMessage}
                      </div>
                    )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
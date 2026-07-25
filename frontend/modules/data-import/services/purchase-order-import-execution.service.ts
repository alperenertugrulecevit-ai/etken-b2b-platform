import "server-only";

import {
  DataImportMode,
  DataImportRowStatus,
  DataImportStatus,
  DataImportType,
  PurchaseOrderStatus,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  PURCHASE_ORDER_IMPORT_TEMPLATE,
} from "@/modules/data-import/constants/purchase-order-import.constants";

import type {
  PurchaseOrderImportNormalizedData,
} from "@/modules/data-import/services/purchase-order-import-validation.service";

import type {
  PurchaseOrderLineImportNormalizedData,
} from "@/modules/data-import/services/purchase-order-line-import-validation.service";

function normalizeSheetName(
  value: string
) {
  return value
    .trim()
    .toLocaleLowerCase(
      "tr-TR"
    )
    .replaceAll("ı", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}

function normalizeName(
  value: string
) {
  return value
    .trim()
    .toLocaleUpperCase(
      "tr-TR"
    );
}

function assertOrderData(
  data:
    PurchaseOrderImportNormalizedData
) {
  if (
    !data.purchaseNumber ||
    !data.supplierName ||
    !data.status ||
    !data.orderDate ||
    data.paymentTermDays ===
      null ||
    data.discountRate ===
      null
  ) {
    throw new Error(
      "Ön izlemedeki satın alma siparişi verilerinden biri eksik."
    );
  }

  return {
    purchaseNumber:
      data.purchaseNumber,

    supplierName:
      data.supplierName,

    status:
      data.status,

    orderDate:
      new Date(
        data.orderDate
      ),

    expectedDate:
      data.expectedDate
        ? new Date(
            data.expectedDate
          )
        : null,

    paymentTermDays:
      data.paymentTermDays,

    discountRate:
      data.discountRate,

    supplierNote:
      data.supplierNote,

    internalNote:
      data.internalNote,
  };
}

function assertLineData(
  data:
    PurchaseOrderLineImportNormalizedData
) {
  if (
    !data.purchaseNumber ||
    !data.productCode ||
    data.orderedQuantity ===
      null ||
    data.unitPrice ===
      null ||
    data.vatRate ===
      null
  ) {
    throw new Error(
      "Ön izlemedeki satın alma siparişi ürün satırlarından biri eksik."
    );
  }

  return {
    purchaseNumber:
      data.purchaseNumber,

    productCode:
      data.productCode,

    orderedQuantity:
      data.orderedQuantity,

    unitPrice:
      data.unitPrice,

    vatRate:
      data.vatRate,
  };
}

function calculateLine({
  orderedQuantity,
  unitPrice,
  vatRate,
  discountRate,
}: {
  orderedQuantity: number;
  unitPrice: number;
  vatRate: number;
  discountRate: number;
}) {
  const grossLine =
    orderedQuantity *
    unitPrice;

  const lineDiscount =
    grossLine *
    (
      discountRate /
      100
    );

  const lineNet =
    grossLine -
    lineDiscount;

  const vatAmount =
    lineNet *
    (
      vatRate /
      100
    );

  const lineTotal =
    lineNet +
    vatAmount;

  return {
    grossLine,
    lineDiscount,
    lineNet,
    vatAmount,
    lineTotal,
  };
}

export class PurchaseOrderImportExecutionService {
  static async execute(
    jobId: string
  ) {
    const normalizedJobId =
      jobId.trim();

    if (!normalizedJobId) {
      throw new Error(
        "Aktarım ön izleme kaydı bulunamadı."
      );
    }

    return prisma.$transaction(
      async (tx) => {
        const job =
          await tx.dataImportJob.findUnique({
            where: {
              id:
                normalizedJobId,
            },

            include: {
              rows: {
                orderBy: [
                  {
                    sheetName:
                      "asc",
                  },
                  {
                    rowNumber:
                      "asc",
                  },
                ],
              },
            },
          });

        if (!job) {
          throw new Error(
            "Aktarım ön izleme kaydı bulunamadı."
          );
        }

        if (
          job.importType !==
          DataImportType.PURCHASE_ORDER
        ) {
          throw new Error(
            "Bu kayıt bir satın alma siparişi aktarımı değil."
          );
        }

        if (
          job.status !==
          DataImportStatus.READY
        ) {
          throw new Error(
            "Bu aktarım daha önce işlenmiş veya işleme kapatılmış."
          );
        }

        if (
          job.invalidRows >
          0
        ) {
          throw new Error(
            "Hatalı satırlar düzeltilmeden satın alma siparişi aktarımı onaylanamaz."
          );
        }

        const validRows =
          job.rows.filter(
            (row) =>
              row.status ===
              DataImportRowStatus.VALID
          );

        const orderSheetName =
          normalizeSheetName(
            PURCHASE_ORDER_IMPORT_TEMPLATE
              .orderSheetName
          );

        const lineSheetName =
          normalizeSheetName(
            PURCHASE_ORDER_IMPORT_TEMPLATE
              .lineSheetName
          );

        const orderRows =
          validRows
            .filter(
              (row) =>
                normalizeSheetName(
                  row.sheetName
                ) ===
                orderSheetName
            )
            .map(
              (row) => ({
                row,

                data:
                  assertOrderData(
                    row.normalizedData as unknown as
                      PurchaseOrderImportNormalizedData
                  ),
              })
            );

        const lineRows =
          validRows
            .filter(
              (row) =>
                normalizeSheetName(
                  row.sheetName
                ) ===
                lineSheetName
            )
            .map(
              (row) => ({
                row,

                data:
                  assertLineData(
                    row.normalizedData as unknown as
                      PurchaseOrderLineImportNormalizedData
                  ),
              })
            );

        if (
          orderRows.length ===
          0 ||
          lineRows.length ===
          0
        ) {
          throw new Error(
            "Aktarılacak satın alma siparişi veya ürün satırı bulunamadı."
          );
        }

        const supplierNames =
          Array.from(
            new Set(
              orderRows.map(
                ({
                  data,
                }) =>
                  data.supplierName
              )
            )
          );

        const suppliers =
          await tx.supplier.findMany({
            where: {
              name: {
                in:
                  supplierNames,
              },
            },

            select: {
              id: true,
              name: true,
              isActive:
                true,
            },
          });

        const allSuppliers =
          await tx.supplier.findMany({
            select: {
              id: true,
              name: true,
              isActive:
                true,
            },
          });

        const supplierByName =
          new Map(
            [
              ...allSuppliers,
              ...suppliers,
            ].map(
              (supplier) => [
                normalizeName(
                  supplier.name
                ),
                supplier,
              ]
            )
          );

        const productCodes =
          Array.from(
            new Set(
              lineRows.map(
                ({
                  data,
                }) =>
                  data.productCode
              )
            )
          );

        const products =
          await tx.product.findMany({
            where: {
              code: {
                in:
                  productCodes,
              },
            },

            select: {
              id: true,
              code: true,
              name: true,
              isActive:
                true,
            },
          });

        const productByCode =
          new Map(
            products.map(
              (product) => [
                product.code
                  .trim()
                  .toLocaleUpperCase(
                    "tr-TR"
                  ),
                product,
              ]
            )
          );

        const purchaseNumbers =
          orderRows.map(
            ({
              data,
            }) =>
              data.purchaseNumber
          );

        const existingOrders =
          await tx.purchaseOrder.findMany({
            where: {
              purchaseNumber: {
                in:
                  purchaseNumbers,
              },
            },

            select: {
              id: true,
              purchaseNumber:
                true,
              status:
                true,

              items: {
                select: {
                  id: true,
                  receivedQuantity:
                    true,
                },
              },
            },
          });

        const existingByNumber =
          new Map(
            existingOrders.map(
              (order) => [
                order.purchaseNumber,
                order,
              ]
            )
          );

        if (
          job.mode ===
          DataImportMode.UPSERT
        ) {
          for (
            const {
              data,
            } of orderRows
          ) {
            const existing =
              existingByNumber.get(
                data.purchaseNumber
              );

            if (!existing) {
              continue;
            }

            if (
              existing.status !==
                PurchaseOrderStatus.DRAFT &&
              existing.status !==
                PurchaseOrderStatus.PENDING
            ) {
              throw new Error(
                `${data.purchaseNumber} siparişi ${existing.status} durumunda olduğu için güncellenemez.`
              );
            }

            if (
              existing.items.some(
                (item) =>
                  item.receivedQuantity >
                  0
              )
            ) {
              throw new Error(
                `${data.purchaseNumber} siparişinde teslim alınmış ürün bulunduğu için güncellenemez.`
              );
            }
          }
        }

        const linesByPurchaseNumber =
          new Map<
            string,
            typeof lineRows
          >();

        for (
          const line of
          lineRows
        ) {
          const current =
            linesByPurchaseNumber.get(
              line.data.purchaseNumber
            ) ?? [];

          current.push(
            line
          );

          linesByPurchaseNumber.set(
            line.data.purchaseNumber,
            current
          );
        }

        await tx.dataImportJob.update({
          where: {
            id:
              job.id,
          },

          data: {
            status:
              DataImportStatus.PROCESSING,

            startedAt:
              new Date(),

            errorMessage:
              null,
          },
        });

        let insertedRows =
          0;

        let updatedRows =
          0;

        let skippedRows =
          0;

        let insertedOrders =
          0;

        let updatedOrders =
          0;

        let skippedOrders =
          0;

        let insertedLines =
          0;

        let updatedLines =
          0;

        let skippedLines =
          0;

        for (
          const {
            row,
            data,
          } of orderRows
        ) {
          const supplier =
            supplierByName.get(
              normalizeName(
                data.supplierName
              )
            );

          if (
            !supplier ||
            !supplier.isActive
          ) {
            throw new Error(
              `${data.supplierName} tedarikçisi bulunamadı veya pasif durumda.`
            );
          }

          const relatedLines =
            linesByPurchaseNumber.get(
              data.purchaseNumber
            ) ?? [];

          if (
            relatedLines.length ===
            0
          ) {
            throw new Error(
              `${data.purchaseNumber} siparişine bağlı ürün satırı bulunamadı.`
            );
          }

          const existing =
            existingByNumber.get(
              data.purchaseNumber
            );

          if (
            existing &&
            job.mode ===
              DataImportMode.CREATE_ONLY
          ) {
            await tx.dataImportRow.update({
              where: {
                id:
                  row.id,
              },

              data: {
                status:
                  DataImportRowStatus.SKIPPED,

                resultRecordId:
                  String(
                    existing.id
                  ),

                errors: [
                  "Satın alma sipariş numarası zaten kayıtlı olduğu için atlandı.",
                ],
              },
            });

            skippedRows +=
              1;

            skippedOrders +=
              1;

            for (
              const relatedLine of
              relatedLines
            ) {
              await tx.dataImportRow.update({
                where: {
                  id:
                    relatedLine.row.id,
                },

                data: {
                  status:
                    DataImportRowStatus.SKIPPED,

                  resultRecordId:
                    null,

                  errors: [
                    "Bağlı satın alma siparişi zaten kayıtlı olduğu için ürün satırı atlandı.",
                  ],
                },
              });

              skippedRows +=
                1;

              skippedLines +=
                1;
            }

            continue;
          }

          let subtotal =
            0;

          let discountAmount =
            0;

          let vatAmount =
            0;

          const preparedLines =
            relatedLines.map(
              (
                relatedLine
              ) => {
                const product =
                  productByCode.get(
                    relatedLine.data
                      .productCode
                  );

                if (
                  !product ||
                  !product.isActive
                ) {
                  throw new Error(
                    `${relatedLine.data.productCode} ürünü bulunamadı veya pasif durumda.`
                  );
                }

                const calculated =
                  calculateLine({
                    orderedQuantity:
                      relatedLine.data
                        .orderedQuantity,

                    unitPrice:
                      relatedLine.data
                        .unitPrice,

                    vatRate:
                      relatedLine.data
                        .vatRate,

                    discountRate:
                      data.discountRate,
                  });

                subtotal +=
                  calculated.grossLine;

                discountAmount +=
                  calculated.lineDiscount;

                vatAmount +=
                  calculated.vatAmount;

                return {
                  relatedLine,
                  product,
                  calculated,
                };
              }
            );

          const totalAmount =
            subtotal -
            discountAmount +
            vatAmount;

          const approvedAt =
            data.status ===
            PurchaseOrderStatus.APPROVED
              ? new Date()
              : null;

          let purchaseOrderId:
            number;

          let rowStatus:
            DataImportRowStatus;

          if (existing) {
            await tx.purchaseOrderItem.deleteMany({
              where: {
                purchaseOrderId:
                  existing.id,
              },
            });

            const purchaseOrder =
              await tx.purchaseOrder.update({
                where: {
                  id:
                    existing.id,
                },

                data: {
                  supplierId:
                    supplier.id,

                  status:
                    data.status,

                  orderDate:
                    data.orderDate,

                  expectedDate:
                    data.expectedDate,

                  paymentTermDays:
                    data.paymentTermDays,

                  discountRate:
                    data.discountRate,

                  subtotal,
                  discountAmount,
                  vatAmount,
                  totalAmount,

                  supplierNote:
                    data.supplierNote,

                  internalNote:
                    data.internalNote,

                  approvedAt,

                  receivedAt:
                    null,
                },

                select: {
                  id: true,
                },
              });

            purchaseOrderId =
              purchaseOrder.id;

            rowStatus =
              DataImportRowStatus.UPDATED;

            updatedRows +=
              1;

            updatedOrders +=
              1;
          } else {
            const purchaseOrder =
              await tx.purchaseOrder.create({
                data: {
                  purchaseNumber:
                    data.purchaseNumber,

                  supplierId:
                    supplier.id,

                  status:
                    data.status,

                  orderDate:
                    data.orderDate,

                  expectedDate:
                    data.expectedDate,

                  paymentTermDays:
                    data.paymentTermDays,

                  discountRate:
                    data.discountRate,

                  subtotal,
                  discountAmount,
                  vatAmount,
                  totalAmount,

                  supplierNote:
                    data.supplierNote,

                  internalNote:
                    data.internalNote,

                  approvedAt,

                  receivedAt:
                    null,
                },

                select: {
                  id: true,
                },
              });

            purchaseOrderId =
              purchaseOrder.id;

            rowStatus =
              DataImportRowStatus.IMPORTED;

            insertedRows +=
              1;

            insertedOrders +=
              1;
          }

          await tx.dataImportRow.update({
            where: {
              id:
                row.id,
            },

            data: {
              status:
                rowStatus,

              resultRecordId:
                String(
                  purchaseOrderId
                ),

              errors: [],
            },
          });

          for (
            const {
              relatedLine,
              product,
              calculated,
            } of preparedLines
          ) {
            const item =
              await tx.purchaseOrderItem.create({
                data: {
                  purchaseOrderId,

                  productId:
                    product.id,

                  productCode:
                    product.code,

                  productName:
                    product.name,

                  orderedQuantity:
                    relatedLine.data
                      .orderedQuantity,

                  receivedQuantity:
                    0,

                  unitPrice:
                    relatedLine.data
                      .unitPrice,

                  vatRate:
                    relatedLine.data
                      .vatRate,

                  lineNet:
                    calculated.lineNet,

                  vatAmount:
                    calculated.vatAmount,

                  lineTotal:
                    calculated.lineTotal,
                },

                select: {
                  id: true,
                },
              });

            await tx.dataImportRow.update({
              where: {
                id:
                  relatedLine.row.id,
              },

              data: {
                status:
                  existing
                    ? DataImportRowStatus.UPDATED
                    : DataImportRowStatus.IMPORTED,

                resultRecordId:
                  String(
                    item.id
                  ),

                errors: [],
              },
            });

            if (existing) {
              updatedRows +=
                1;

              updatedLines +=
                1;
            } else {
              insertedRows +=
                1;

              insertedLines +=
                1;
            }
          }
        }

        return tx.dataImportJob.update({
          where: {
            id:
              job.id,
          },

          data: {
            status:
              DataImportStatus.COMPLETED,

            insertedRows,
            updatedRows,
            skippedRows,

            failedRows:
              0,

            finishedAt:
              new Date(),

            summary: {
              insertedRows,
              updatedRows,
              skippedRows,

              orders: {
                inserted:
                  insertedOrders,

                updated:
                  updatedOrders,

                skipped:
                  skippedOrders,
              },

              lines: {
                inserted:
                  insertedLines,

                updated:
                  updatedLines,

                skipped:
                  skippedLines,
              },
            },
          },

          select: {
            id: true,
            importNumber:
              true,
            status: true,
            insertedRows:
              true,
            updatedRows:
              true,
            skippedRows:
              true,
          },
        });
      },
      {
        maxWait:
          10000,

        timeout:
          120000,
      }
    );
  }
}
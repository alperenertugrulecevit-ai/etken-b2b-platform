import "server-only";

import {
  DataImportMode,
  DataImportRowStatus,
  DataImportStatus,
  DataImportType,
  OrderStatus,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  SALES_ORDER_IMPORT_TEMPLATE,
} from "@/modules/data-import/constants/sales-order-import.constants";

import type {
  SalesOrderImportNormalizedData,
} from "@/modules/data-import/services/sales-order-import-validation.service";

import type {
  SalesOrderLineImportNormalizedData,
} from "@/modules/data-import/services/sales-order-line-import-validation.service";

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
    SalesOrderImportNormalizedData
) {
  if (
    !data.orderNumber ||
    !data.customerCode ||
    !data.status ||
    !data.orderDate ||
    data.paymentTermDays ===
      null ||
    data.discountRate ===
      null
  ) {
    throw new Error(
      "Ön izlemedeki sevk siparişi verilerinden biri eksik."
    );
  }

  return {
    orderNumber:
      data.orderNumber,

    customerCode:
      data.customerCode,

    shippingAddressTitle:
      data.shippingAddressTitle,

    status:
      data.status,

    orderDate:
      new Date(
        data.orderDate
      ),

    requestedDate:
      data.requestedDate
        ? new Date(
            data.requestedDate
          )
        : null,

    paymentTermDays:
      data.paymentTermDays,

    discountRate:
      data.discountRate,

    customerNote:
      data.customerNote,

    internalNote:
      data.internalNote,
  };
}

function assertLineData(
  data:
    SalesOrderLineImportNormalizedData
) {
  if (
    !data.orderNumber ||
    !data.productCode ||
    data.quantity ===
      null ||
    data.unitPrice ===
      null ||
    data.vatRate ===
      null
  ) {
    throw new Error(
      "Ön izlemedeki sevk siparişi ürün satırlarından biri eksik."
    );
  }

  return {
    orderNumber:
      data.orderNumber,

    productCode:
      data.productCode,

    quantity:
      data.quantity,

    unitPrice:
      data.unitPrice,

    vatRate:
      data.vatRate,
  };
}

function calculateLine({
  quantity,
  unitPrice,
  vatRate,
  discountRate,
}: {
  quantity: number;
  unitPrice: number;
  vatRate: number;
  discountRate: number;
}) {
  const grossLine =
    quantity *
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

export class SalesOrderImportExecutionService {
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
          DataImportType.SALES_ORDER
        ) {
          throw new Error(
            "Bu kayıt bir sevk siparişi aktarımı değil."
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
            "Hatalı satırlar düzeltilmeden sevk siparişi aktarımı onaylanamaz."
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
            SALES_ORDER_IMPORT_TEMPLATE
              .orderSheetName
          );

        const lineSheetName =
          normalizeSheetName(
            SALES_ORDER_IMPORT_TEMPLATE
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
                      SalesOrderImportNormalizedData
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
                      SalesOrderLineImportNormalizedData
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
            "Aktarılacak sevk siparişi veya ürün satırı bulunamadı."
          );
        }

        const customerCodes =
          Array.from(
            new Set(
              orderRows.map(
                ({ data }) =>
                  data.customerCode
              )
            )
          );

        const customers =
          await tx.customer.findMany({
            where: {
              customerCode: {
                in: customerCodes,
              },
            },
            select: {
              id: true,
              customerCode: true,
              companyName: true,
              isActive: true,
              addresses: {
                select: {
                  id: true,
                  title: true,
                  isDefault: true,
                  isActive: true,
                },
              },
            },
          });

        const customerByCode =
          new Map(
            customers.map(
              (customer) => [
                normalizeName(
                  customer.customerCode
                ),
                customer,
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

        const orderNumbers =
          orderRows.map(
            ({
              data,
            }) =>
              data.orderNumber
          );

        const existingOrders =
          await tx.order.findMany({
            where: {
              orderNumber: {
                in:
                  orderNumbers,
              },
            },

            select: {
              id: true,
              orderNumber:
                true,
              status:
                true,

              stockReserved:
                true,

              items: {
                select: {
                  id: true,
                  pickedQuantity:
                    true,

                  packedQuantity:
                    true,

                  shippedQuantity:
                    true,
                },
              },
            },
          });

        const existingByNumber =
          new Map(
            existingOrders.map(
              (order) => [
                order.orderNumber,
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
                data.orderNumber
              );

            if (!existing) {
              continue;
            }

            if (
              existing.status !==
                OrderStatus.DRAFT &&
              existing.status !==
                OrderStatus.PENDING
            ) {
              throw new Error(
                `${data.orderNumber} siparişi ${existing.status} durumunda olduğu için güncellenemez.`
              );
            }

            if (
              existing.stockReserved
            ) {
              throw new Error(
                `${data.orderNumber} siparişinin stoğu rezerve edildiği için güncellenemez.`
              );
            }

            if (
              existing.items.some(
                (item) =>
                  item.pickedQuantity >
                    0 ||
                  item.packedQuantity >
                    0 ||
                  item.shippedQuantity >
                    0
              )
            ) {
              throw new Error(
                `${data.orderNumber} siparişinde toplanmış, paketlenmiş veya sevk edilmiş ürün bulunduğu için güncellenemez.`
              );
            }
          }
        }

        const linesByOrderNumber =
          new Map<
            string,
            typeof lineRows
          >();

        for (
          const line of
          lineRows
        ) {
          const current =
            linesByOrderNumber.get(
              line.data.orderNumber
            ) ?? [];

          current.push(
            line
          );

          linesByOrderNumber.set(
            line.data.orderNumber,
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
          const customer =
            customerByCode.get(
              normalizeName(
                data.customerCode
              )
            );

          if (
            !customer ||
            !customer.isActive
          ) {
            throw new Error(
              `${data.customerCode} müşterisi bulunamadı veya pasif durumda.`
            );
          }

          const activeAddresses =
            customer.addresses.filter(
              (address) =>
                address.isActive
            );

          const shippingAddress =
            data.shippingAddressTitle
              ? activeAddresses.find(
                  (address) =>
                    normalizeName(
                      address.title
                    ) ===
                    normalizeName(
                      data.shippingAddressTitle as string
                    )
                ) ?? null
              : activeAddresses.find(
                  (address) =>
                    address.isDefault
                ) ??
                activeAddresses[0] ??
                null;

          if (
            data.shippingAddressTitle &&
            !shippingAddress
          ) {
            throw new Error(
              `${data.customerCode} müşterisinin "${data.shippingAddressTitle}" teslimat adresi bulunamadı veya pasif durumda.`
            );
          }

          const relatedLines =
            linesByOrderNumber.get(
              data.orderNumber
            ) ?? [];

          if (
            relatedLines.length ===
            0
          ) {
            throw new Error(
              `${data.orderNumber} siparişine bağlı ürün satırı bulunamadı.`
            );
          }

          const existing =
            existingByNumber.get(
              data.orderNumber
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
                  "Sevk sipariş numarası zaten kayıtlı olduğu için atlandı.",
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
                    "Bağlı sevk siparişi zaten kayıtlı olduğu için ürün satırı atlandı.",
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
                    quantity:
                      relatedLine.data
                        .quantity,

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

          let orderId:
            number;

          let rowStatus:
            DataImportRowStatus;

          if (existing) {
            await tx.orderItem.deleteMany({
              where: {
                orderId:
                  existing.id,
              },
            });

            const order =
              await tx.order.update({
                where: {
                  id:
                    existing.id,
                },

                data: {
                  customerId:
                    customer.id,

                  shippingAddressId:
                    shippingAddress?.id ?? null,

                  status:
                    data.status,

                  orderDate:
                    data.orderDate,

                  requestedDate:
                    data.requestedDate,

                  paymentTermDays:
                    data.paymentTermDays,

                  discountRate:
                    data.discountRate,

                  subtotal,
                  discountAmount,
                  vatAmount,
                  totalAmount,

                  customerNote:
                    data.customerNote,

                  internalNote:
                    data.internalNote,


                },

                select: {
                  id: true,
                },
              });

            orderId =
              order.id;

            rowStatus =
              DataImportRowStatus.UPDATED;

            updatedRows +=
              1;

            updatedOrders +=
              1;
          } else {
            const order =
              await tx.order.create({
                data: {
                  orderNumber:
                    data.orderNumber,

                  customerId:
                    customer.id,

                  shippingAddressId:
                    shippingAddress?.id ?? null,

                  status:
                    data.status,

                  orderDate:
                    data.orderDate,

                  requestedDate:
                    data.requestedDate,

                  paymentTermDays:
                    data.paymentTermDays,

                  discountRate:
                    data.discountRate,

                  subtotal,
                  discountAmount,
                  vatAmount,
                  totalAmount,

                  customerNote:
                    data.customerNote,

                  internalNote:
                    data.internalNote,


                },

                select: {
                  id: true,
                },
              });

            orderId =
              order.id;

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
                  orderId
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
              await tx.orderItem.create({
                data: {
                  orderId,

                  productId:
                    product.id,

                  productCode:
                    product.code,

                  productName:
                    product.name,

                  quantity:
                    relatedLine.data
                      .quantity,

                  pickedQuantity:
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
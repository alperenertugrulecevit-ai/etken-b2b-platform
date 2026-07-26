import "server-only";

import {
  DataImportMode,
  DataImportRowStatus,
  DataImportStatus,
  DataImportType,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import type {
  ProductImportNormalizedData,
} from "@/modules/data-import/services/product-import-validation.service";

function assertProductData(
  data:
    ProductImportNormalizedData
) {
  if (
    !data.code ||
    !data.barcode ||
    !data.name ||
    !data.brand ||
    !data.category ||
    !data.supplier ||
    data.price === null ||
    data.vat === null ||
    data.ownStock === null ||
    data.isActive === null
  ) {
    throw new Error(
      "Ön izlemedeki ürün verilerinden biri eksik. Dosyayı yeniden yükleyin."
    );
  }

  return {
    code:
      data.code,

    barcode:
      data.barcode,

    name:
      data.name,

    brand:
      data.brand,

    category:
      data.category,

    supplier:
      data.supplier,

    price:
      data.price,

    vat:
      data.vat,

    ownStock:
      data.ownStock,

    isActive:
      data.isActive,
  };
}

export class ProductImportExecutionService {
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
          await tx.dataImportJob
            .findUnique({
              where: {
                id:
                  normalizedJobId,
              },

              include: {
                rows: {
                  orderBy: {
                    rowNumber:
                      "asc",
                  },
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
          DataImportType.PRODUCT
        ) {
          throw new Error(
            "Bu kayıt bir ürün aktarımı değil."
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
          job.invalidRows > 0
        ) {
          throw new Error(
            "Hatalı satırlar düzeltilmeden ürün aktarımı onaylanamaz."
          );
        }

        const validRows =
          job.rows.filter(
            (row) =>
              row.status ===
              DataImportRowStatus.VALID
          );

        if (
          validRows.length === 0
        ) {
          throw new Error(
            "Aktarılacak geçerli ürün satırı bulunamadı."
          );
        }

        const preparedRows =
          validRows.map(
            (row) => ({
              row,

              data:
                assertProductData(
                  row.normalizedData as unknown as
                    ProductImportNormalizedData
                ),
            })
          );

        const codes =
          preparedRows.map(
            ({ data }) =>
              data.code
          );

        const barcodes =
          preparedRows.map(
            ({ data }) =>
              data.barcode
          );

        const existingProducts =
          await tx.product
            .findMany({
              where: {
                OR: [
                  {
                    code: {
                      in: codes,
                    },
                  },
                  {
                    barcode: {
                      in:
                        barcodes,
                    },
                  },
                ],
              },

              select: {
                id: true,
                code: true,
                barcode: true,
              },
            });

        const existingByCode =
          new Map(
            existingProducts.map(
              (product) => [
                product.code,
                product,
              ]
            )
          );

        const existingByBarcode =
          new Map(
            existingProducts.map(
              (product) => [
                product.barcode,
                product,
              ]
            )
          );

        for (
          const {
            data,
          } of preparedRows
        ) {
          const barcodeOwner =
            existingByBarcode.get(
              data.barcode
            );

          if (
            barcodeOwner &&
            barcodeOwner.code !==
              data.code
          ) {
            throw new Error(
              `${data.barcode} barkodu ${barcodeOwner.code} ürününde kullanılıyor.`
            );
          }
        }

        await tx.dataImportJob
          .update({
            where: {
              id: job.id,
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

        let insertedRows = 0;
        let updatedRows = 0;
        let skippedRows = 0;

        for (
          const {
            row,
            data,
          } of preparedRows
        ) {
          const existing =
            existingByCode.get(
              data.code
            );

          if (
            existing &&
            job.mode ===
              DataImportMode.CREATE_ONLY
          ) {
            await tx.dataImportRow
              .update({
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
                    "Ürün kodu zaten kayıtlı olduğu için atlandı.",
                  ],
                },
              });

            skippedRows += 1;
            continue;
          }

          if (existing) {
            const product =
              await tx.product
                .update({
                  where: {
                    id:
                      existing.id,
                  },

                  data: {
                    barcode:
                      data.barcode,

                    name:
                      data.name,

                    brand:
                      data.brand,

                    category:
                      data.category,

                    supplier:
                      data.supplier,

                    price:
                      data.price,

                    vat:
                      data.vat,

                    ownStock:
                      data.ownStock,

                    isActive:
                      data.isActive,
                  },

                  select: {
                    id: true,
                  },
                });

            await tx.dataImportRow
              .update({
                where: {
                  id:
                    row.id,
                },

                data: {
                  status:
                    DataImportRowStatus.UPDATED,

                  resultRecordId:
                    String(
                      product.id
                    ),

                  errors: [],
                },
              });

            updatedRows += 1;
            continue;
          }

          const product =
            await tx.product
              .create({
                data: {
                  code:
                    data.code,

                  barcode:
                    data.barcode,

                  name:
                    data.name,

                  brand:
                    data.brand,

                  category:
                    data.category,

                  supplier:
                    data.supplier,

                  price:
                    data.price,

                  stock: 0,

                  reservedStock:
                    0,

                  vat:
                    data.vat,

                  ownStock:
                    data.ownStock,

                  isActive:
                    data.isActive,
                },

                select: {
                  id: true,
                },
              });

          await tx.dataImportRow
            .update({
              where: {
                id:
                  row.id,
              },

              data: {
                status:
                  DataImportRowStatus.IMPORTED,

                resultRecordId:
                  String(
                    product.id
                  ),

                errors: [],
              },
            });

          insertedRows += 1;
        }

        return tx.dataImportJob
          .update({
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

              failedRows: 0,

              finishedAt:
                new Date(),

              summary: {
                insertedRows,
                updatedRows,
                skippedRows,
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
        maxWait: 10000,
        timeout: 60000,
      }
    );
  }
}

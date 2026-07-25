import "server-only";

import {
  DataImportMode,
  DataImportRowStatus,
  DataImportStatus,
  DataImportType,
  Prisma,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  PURCHASE_ORDER_IMPORT_TEMPLATE,
} from "@/modules/data-import/constants/purchase-order-import.constants";

import {
  DataImportFileService,
} from "@/modules/data-import/services/data-import-file.service";

import {
  PurchaseOrderImportValidationService,
} from "@/modules/data-import/services/purchase-order-import-validation.service";

import {
  PurchaseOrderLineImportValidationService,
} from "@/modules/data-import/services/purchase-order-line-import-validation.service";

import type {
  ParsedImportSheet,
} from "@/modules/data-import/types/data-import.types";

function createImportNumber() {
  const now =
    new Date();

  const compact = [
    now.getFullYear(),

    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    ),

    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    ),

    String(
      now.getHours()
    ).padStart(
      2,
      "0"
    ),

    String(
      now.getMinutes()
    ).padStart(
      2,
      "0"
    ),

    String(
      now.getSeconds()
    ).padStart(
      2,
      "0"
    ),
  ].join("");

  const random =
    Math.random()
      .toString(36)
      .slice(
        2,
        7
      )
      .toUpperCase();

  return `IMP-${compact}-${random}`;
}

function resolveMode(
  value: string
) {
  return (
    value ===
    DataImportMode.UPSERT
  )
    ? DataImportMode.UPSERT
    : DataImportMode.CREATE_ONLY;
}

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

function findRequiredSheet({
  sheets,
  expectedName,
}: {
  sheets:
    ParsedImportSheet[];

  expectedName:
    string;
}) {
  const normalizedExpected =
    normalizeSheetName(
      expectedName
    );

  const sheet =
    sheets.find(
      (item) =>
        normalizeSheetName(
          item.name
        ) ===
        normalizedExpected
    );

  if (!sheet) {
    throw new Error(
      `${expectedName} çalışma sayfası Excel dosyasında bulunamadı.`
    );
  }

  return sheet;
}

export class PurchaseOrderImportPreviewService {
  static async createPreview({
    file,
    mode,
    createdById,
    createdByName,
  }: {
    file: File;
    mode: string;
    createdById: string;
    createdByName: string;
  }) {
    const buffer =
      Buffer.from(
        await file.arrayBuffer()
      );

    const workbook =
      await DataImportFileService.parseWorkbook({
        buffer,
        fileName:
          file.name,
        mimeType:
          file.type,
      });

    if (
      workbook.sheets.length !==
      2
    ) {
      throw new Error(
        "Satın alma siparişi aktarım dosyası SatinalmaSiparisleri ve SiparisSatirlari olmak üzere iki çalışma sayfası içermelidir."
      );
    }

    const orderSheet =
      findRequiredSheet({
        sheets:
          workbook.sheets,

        expectedName:
          PURCHASE_ORDER_IMPORT_TEMPLATE
            .orderSheetName,
      });

    const lineSheet =
      findRequiredSheet({
        sheets:
          workbook.sheets,

        expectedName:
          PURCHASE_ORDER_IMPORT_TEMPLATE
            .lineSheetName,
      });

    const orderRows =
      PurchaseOrderImportValidationService
        .validateSheet(
          orderSheet
        );

    if (
      orderRows.length ===
      0
    ) {
      throw new Error(
        "SatinalmaSiparisleri çalışma sayfasında aktarılacak sipariş bulunamadı."
      );
    }

    const structurallyValidPurchaseNumbers =
      new Set(
        orderRows
          .filter(
            (row) =>
              row.errors.length ===
                0 &&
              Boolean(
                row.normalizedData
                  .purchaseNumber
              )
          )
          .map(
            (row) =>
              row.normalizedData
                .purchaseNumber as string
          )
      );

    const lineRows =
      PurchaseOrderLineImportValidationService
        .validateSheet(
          lineSheet,
          structurallyValidPurchaseNumbers
        );

    if (
      lineRows.length ===
      0
    ) {
      throw new Error(
        "SiparisSatirlari çalışma sayfasında aktarılacak ürün satırı bulunamadı."
      );
    }

    /*
     * Tedarikçi kontrolleri
     */
    const supplierNames =
      Array.from(
        new Set(
          orderRows
            .map(
              (row) =>
                row.normalizedData
                  .supplierName
            )
            .filter(
              (
                supplierName
              ): supplierName is string =>
                Boolean(
                  supplierName
                )
            )
        )
      );

    const suppliers =
      await prisma.supplier.findMany({
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

    /*
     * Büyük/küçük harf farkını
     * önlemek için ayrıca mevcut
     * tedarikçi adlarını kontrol eder.
     */
    const allSuppliers =
      await prisma.supplier.findMany({
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

    for (
      const row of
      orderRows
    ) {
      const supplierName =
        row.normalizedData
          .supplierName;

      if (!supplierName) {
        continue;
      }

      const supplier =
        supplierByName.get(
          normalizeName(
            supplierName
          )
        );

      if (!supplier) {
        row.errors.push(
          `${supplierName} tedarikçisi sistemde bulunamadı.`
        );

        continue;
      }

      if (
        !supplier.isActive
      ) {
        row.errors.push(
          `${supplier.name} tedarikçisi pasif durumda.`
        );
      }
    }

    /*
     * Ürün kontrolleri
     */
    const productCodes =
      Array.from(
        new Set(
          lineRows
            .map(
              (row) =>
                row.normalizedData
                  .productCode
            )
            .filter(
              (
                productCode
              ): productCode is string =>
                Boolean(
                  productCode
                )
            )
        )
      );

    const products =
      productCodes.length >
      0
        ? await prisma.product.findMany({
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
          })
        : [];

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

    for (
      const row of
      lineRows
    ) {
      const productCode =
        row.normalizedData
          .productCode;

      if (!productCode) {
        continue;
      }

      const product =
        productByCode.get(
          productCode
        );

      if (!product) {
        row.errors.push(
          `${productCode} ürün kodu sistemde bulunamadı.`
        );

        continue;
      }

      if (
        !product.isActive
      ) {
        row.errors.push(
          `${product.code} - ${product.name} ürünü pasif durumda.`
        );
      }
    }

    /*
     * Her siparişin en az bir
     * yapısal olarak geçerli ürün
     * satırı bulunmalıdır.
     */
    const purchaseNumbersWithLines =
      new Set(
        lineRows
          .filter(
            (row) =>
              row.errors.length ===
                0 &&
              Boolean(
                row.normalizedData
                  .purchaseNumber
              )
          )
          .map(
            (row) =>
              row.normalizedData
                .purchaseNumber as string
          )
      );

    for (
      const row of
      orderRows
    ) {
      const purchaseNumber =
        row.normalizedData
          .purchaseNumber;

      if (
        purchaseNumber &&
        !purchaseNumbersWithLines.has(
          purchaseNumber
        )
      ) {
        row.errors.push(
          `${purchaseNumber} siparişine bağlı geçerli ürün satırı bulunamadı.`
        );
      }
    }

    const allRows = [
      ...orderRows,
      ...lineRows,
    ];

    const validRows =
      allRows.filter(
        (row) =>
          row.errors.length ===
          0
      ).length;

    const invalidRows =
      allRows.length -
      validRows;

    return prisma.$transaction(
      async (tx) => {
        const job =
          await tx.dataImportJob.create({
            data: {
              importNumber:
                createImportNumber(),

              importType:
                DataImportType.PURCHASE_ORDER,

              mode:
                resolveMode(
                  mode
                ),

              status:
                DataImportStatus.READY,

              originalFileName:
                file.name,

              mimeType:
                file.type ||
                null,

              fileSize:
                file.size,

              fileHash:
                workbook.fileHash,

              totalRows:
                allRows.length,

              validRows,
              invalidRows,

              createdById,
              createdByName,

              summary: {
                sheetNames:
                  workbook.sheetNames,

                previewOnly:
                  true,

                orderRows:
                  orderRows.length,

                lineRows:
                  lineRows.length,
              },
            },

            select: {
              id: true,
              importNumber:
                true,
              totalRows:
                true,
              validRows:
                true,
              invalidRows:
                true,
            },
          });

        await tx.dataImportRow.createMany({
          data:
            allRows.map(
              (row) => ({
                jobId:
                  job.id,

                sheetName:
                  row.sheetName,

                rowNumber:
                  row.rowNumber,

                externalKey:
                  row.externalKey,

                status:
                  row.errors.length ===
                  0
                    ? DataImportRowStatus.VALID
                    : DataImportRowStatus.INVALID,

                rawData:
                  row.rawData as
                    Prisma.InputJsonValue,

                normalizedData:
                  row.normalizedData as unknown as
                    Prisma.InputJsonValue,

                errors:
                  row.errors as
                    Prisma.InputJsonValue,
              })
            ),
        });

        return job;
      },
      {
        maxWait:
          10000,

        timeout:
          30000,
      }
    );
  }
}
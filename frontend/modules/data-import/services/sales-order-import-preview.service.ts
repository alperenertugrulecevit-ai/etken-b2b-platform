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
  SALES_ORDER_IMPORT_TEMPLATE,
} from "@/modules/data-import/constants/sales-order-import.constants";

import {
  DataImportFileService,
} from "@/modules/data-import/services/data-import-file.service";

import {
  SalesOrderImportValidationService,
} from "@/modules/data-import/services/sales-order-import-validation.service";

import {
  SalesOrderLineImportValidationService,
} from "@/modules/data-import/services/sales-order-line-import-validation.service";

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

export class SalesOrderImportPreviewService {
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
        "Sevk siparişi aktarım dosyası SevkSiparisleri ve SiparisSatirlari olmak üzere iki çalışma sayfası içermelidir."
      );
    }

    const orderSheet =
      findRequiredSheet({
        sheets:
          workbook.sheets,

        expectedName:
          SALES_ORDER_IMPORT_TEMPLATE
            .orderSheetName,
      });

    const lineSheet =
      findRequiredSheet({
        sheets:
          workbook.sheets,

        expectedName:
          SALES_ORDER_IMPORT_TEMPLATE
            .lineSheetName,
      });

    const orderRows =
      SalesOrderImportValidationService
        .validateSheet(
          orderSheet
        );

    if (
      orderRows.length ===
      0
    ) {
      throw new Error(
        "SevkSiparisleri çalışma sayfasında aktarılacak sipariş bulunamadı."
      );
    }

    const structurallyValidOrderNumbers =
      new Set(
        orderRows
          .filter(
            (row) =>
              row.errors.length ===
                0 &&
              Boolean(
                row.normalizedData
                  .orderNumber
              )
          )
          .map(
            (row) =>
              row.normalizedData
                .orderNumber as string
          )
      );

    const lineRows =
      SalesOrderLineImportValidationService
        .validateSheet(
          lineSheet,
          structurallyValidOrderNumbers
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
     * Müşteri ve teslimat adresi
     * kontrolleri
     */
    const customerCodes =
      Array.from(
        new Set(
          orderRows
            .map(
              (row) =>
                row.normalizedData
                  .customerCode
            )
            .filter(
              (
                customerCode
              ): customerCode is string =>
                Boolean(
                  customerCode
                )
            )
        )
      );

    const customers =
      customerCodes.length > 0
        ? await prisma.customer.findMany({
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
                  isActive: true,
                },
              },
            },
          })
        : [];

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

    for (const row of orderRows) {
      const {
        customerCode,
        shippingAddressTitle,
      } = row.normalizedData;

      if (!customerCode) {
        continue;
      }

      const customer =
        customerByCode.get(
          normalizeName(
            customerCode
          )
        );

      if (!customer) {
        row.errors.push(
          `${customerCode} müşteri kodu sistemde bulunamadı.`
        );

        continue;
      }

      if (!customer.isActive) {
        row.errors.push(
          `${customer.customerCode} - ${customer.companyName} müşterisi pasif durumda.`
        );
      }

      if (shippingAddressTitle) {
        const address =
          customer.addresses.find(
            (item) =>
              normalizeName(
                item.title
              ) ===
              normalizeName(
                shippingAddressTitle
              )
          );

        if (!address) {
          row.errors.push(
            `${customer.customerCode} müşterisinde "${shippingAddressTitle}" başlıklı teslimat adresi bulunamadı.`
          );
        } else if (!address.isActive) {
          row.errors.push(
            `${customer.customerCode} müşterisinin "${address.title}" teslimat adresi pasif durumda.`
          );
        }
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
    const orderNumbersWithLines =
      new Set(
        lineRows
          .filter(
            (row) =>
              row.errors.length ===
                0 &&
              Boolean(
                row.normalizedData
                  .orderNumber
              )
          )
          .map(
            (row) =>
              row.normalizedData
                .orderNumber as string
          )
      );

    for (
      const row of
      orderRows
    ) {
      const orderNumber =
        row.normalizedData
          .orderNumber;

      if (
        orderNumber &&
        !orderNumbersWithLines.has(
          orderNumber
        )
      ) {
        row.errors.push(
          `${orderNumber} siparişine bağlı geçerli ürün satırı bulunamadı.`
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
                DataImportType.SALES_ORDER,

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
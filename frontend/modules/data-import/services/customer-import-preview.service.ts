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
  CUSTOMER_IMPORT_TEMPLATE,
} from "@/modules/data-import/constants/customer-import.constants";

import {
  CustomerAddressImportValidationService,
} from "@/modules/data-import/services/customer-address-import-validation.service";

import {
  CustomerImportValidationService,
} from "@/modules/data-import/services/customer-import-validation.service";

import {
  DataImportFileService,
} from "@/modules/data-import/services/data-import-file.service";

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

export class CustomerImportPreviewService {
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
        "Müşteri aktarım dosyası Musteriler ve TeslimatAdresleri olmak üzere iki çalışma sayfası içermelidir."
      );
    }

    const customerSheet =
      findRequiredSheet({
        sheets:
          workbook.sheets,

        expectedName:
          CUSTOMER_IMPORT_TEMPLATE
            .customerSheetName,
      });

    const addressSheet =
      findRequiredSheet({
        sheets:
          workbook.sheets,

        expectedName:
          CUSTOMER_IMPORT_TEMPLATE
            .addressSheetName,
      });

    const customerRows =
      CustomerImportValidationService
        .validateSheet(
          customerSheet
        );

    /*
     * Teslimat adresleri yalnızca
     * aynı Excel dosyasındaki
     * hatasız müşterilere
     * bağlanabilir.
     */
    const validCustomerCodes =
      new Set(
        customerRows
          .filter(
            (row) =>
              row.errors.length ===
                0 &&
              Boolean(
                row.normalizedData
                  .customerCode
              )
          )
          .map(
            (row) =>
              row.normalizedData
                .customerCode as string
          )
      );

    const addressRows =
      CustomerAddressImportValidationService
        .validateSheet(
          addressSheet,
          validCustomerCodes
        );

    const allRows = [
      ...customerRows,
      ...addressRows,
    ];

    if (
      customerRows.length ===
      0
    ) {
      throw new Error(
        "Musteriler çalışma sayfasında aktarılacak müşteri satırı bulunamadı."
      );
    }

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
                DataImportType.CUSTOMER,

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

                customerRows:
                  customerRows.length,

                addressRows:
                  addressRows.length,

                validCustomerCodes:
                  validCustomerCodes.size,
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

        if (
          allRows.length >
          0
        ) {
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
        }

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
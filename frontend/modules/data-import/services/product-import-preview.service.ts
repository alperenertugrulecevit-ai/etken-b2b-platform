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
  DataImportFileService,
} from "@/modules/data-import/services/data-import-file.service";

import {
  ProductImportValidationService,
} from "@/modules/data-import/services/product-import-validation.service";

function createImportNumber() {
  const now = new Date();

  const date = [
    now.getFullYear(),

    String(
      now.getMonth() + 1
    ).padStart(2, "0"),

    String(
      now.getDate()
    ).padStart(2, "0"),
  ].join("");

  const time = [
    String(
      now.getHours()
    ).padStart(2, "0"),

    String(
      now.getMinutes()
    ).padStart(2, "0"),

    String(
      now.getSeconds()
    ).padStart(2, "0"),
  ].join("");

  const random =
    Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase();

  return `IMP-${date}-${time}-${random}`;
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

export class ProductImportPreviewService {
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
      await DataImportFileService
        .parseWorkbook({
          buffer,

          fileName:
            file.name,

          mimeType:
            file.type,
        });

    if (
      workbook.sheets.length !==
      1
    ) {
      throw new Error(
        "Ürün aktarım dosyası tek çalışma sayfası içermelidir."
      );
    }

    const rows =
      ProductImportValidationService
        .validateSheet(
          workbook.sheets[0]
        );

    const validRows =
      rows.filter(
        (row) =>
          row.errors.length ===
          0
      ).length;

    const invalidRows =
      rows.length -
      validRows;

    return prisma.$transaction(
      async (tx) => {
        const job =
          await tx.dataImportJob
            .create({
              data: {
                importNumber:
                  createImportNumber(),

                importType:
                  DataImportType.PRODUCT,

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
                  rows.length,

                validRows,

                invalidRows,

                createdById,

                createdByName,

                summary: {
                  sheetNames:
                    workbook.sheetNames,

                  previewOnly:
                    true,
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
          rows.length > 0
        ) {
          await tx.dataImportRow
            .createMany({
              data:
                rows.map(
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
                      row.errors
                        .length === 0
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
        maxWait: 10000,
        timeout: 30000,
      }
    );
  }
}

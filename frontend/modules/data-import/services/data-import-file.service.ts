import "server-only";

import {
  createHash,
} from "node:crypto";

import readXlsxFile, {
  type Sheet,
} from "read-excel-file/node";

import {
  DATA_IMPORT_LIMITS,
} from "@/modules/data-import/constants/data-import.constants";

import type {
  ImportCellValue,
  ParsedImportRow,
  ParsedImportSheet,
  ParsedImportWorkbook,
} from "@/modules/data-import/types/data-import.types";

export class DataImportFileError
  extends Error {
  constructor(message: string) {
    super(message);
    this.name =
      "DataImportFileError";
  }
}

function normalizeCellValue(
  value: unknown
): ImportCellValue {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  const text =
    String(value).trim();

  if (
    text.length >
    DATA_IMPORT_LIMITS
      .MAX_CELL_TEXT_LENGTH
  ) {
    throw new DataImportFileError(
      `Bir hücre en fazla ${DATA_IMPORT_LIMITS.MAX_CELL_TEXT_LENGTH} karakter olabilir.`
    );
  }

  return text;
}

function isEmptyRow(
  values: ImportCellValue[]
) {
  return values.every(
    (value) =>
      value === null ||
      value === ""
  );
}

export class DataImportFileService {
  static validateFileMetadata({
    fileName,
    mimeType,
    fileSize,
  }: {
    fileName: string;
    mimeType?: string | null;
    fileSize: number;
  }) {
    const normalizedFileName =
      fileName.trim().toLowerCase();

    if (
      !normalizedFileName.endsWith(
        DATA_IMPORT_LIMITS
          .ACCEPTED_EXTENSION
      )
    ) {
      throw new DataImportFileError(
        "Yalnızca .xlsx uzantılı Excel dosyaları yüklenebilir."
      );
    }

    if (
      !Number.isInteger(fileSize) ||
      fileSize <= 0
    ) {
      throw new DataImportFileError(
        "Yüklenen Excel dosyası boş."
      );
    }

    if (
      fileSize >
      DATA_IMPORT_LIMITS
        .MAX_FILE_SIZE_BYTES
    ) {
      throw new DataImportFileError(
        "Excel dosyası en fazla 5 MB olabilir."
      );
    }

    if (
      mimeType &&
      !DATA_IMPORT_LIMITS
        .ACCEPTED_MIME_TYPES
        .includes(
          mimeType as
            (typeof DATA_IMPORT_LIMITS.ACCEPTED_MIME_TYPES)[number]
        )
    ) {
      throw new DataImportFileError(
        "Dosyanın içerik tipi Excel formatıyla uyumlu değil."
      );
    }
  }

  static calculateFileHash(
    buffer: Buffer
  ) {
    return createHash("sha256")
      .update(buffer)
      .digest("hex");
  }

  static async parseWorkbook({
    buffer,
    fileName,
    mimeType,
  }: {
    buffer: Buffer;
    fileName: string;
    mimeType?: string | null;
  }): Promise<ParsedImportWorkbook> {
    this.validateFileMetadata({
      fileName,
      mimeType,
      fileSize: buffer.byteLength,
    });

    let workbookSheets:
      Sheet[];

    try {
      workbookSheets =
        await readXlsxFile(
          buffer
        );
    } catch {
      throw new DataImportFileError(
        "Excel dosyası okunamadı veya geçerli bir .xlsx dosyası değil."
      );
    }

    const sheetNames =
      workbookSheets.map(
        (workbookSheet) =>
          workbookSheet.sheet
      );

    if (sheetNames.length === 0) {
      throw new DataImportFileError(
        "Excel dosyasında çalışma sayfası bulunamadı."
      );
    }

    if (
      sheetNames.length >
      DATA_IMPORT_LIMITS.MAX_SHEETS
    ) {
      throw new DataImportFileError(
        `Excel dosyasında en fazla ${DATA_IMPORT_LIMITS.MAX_SHEETS} çalışma sayfası olabilir.`
      );
    }

    const sheets:
      ParsedImportSheet[] = [];

    let totalDataRows = 0;

    for (
      const workbookSheet
      of workbookSheets
    ) {
      const sheetName =
        workbookSheet.sheet;

      const rawRows =
        workbookSheet.data;

      const rows:
        ParsedImportRow[] = [];

      for (
        let index = 0;
        index < rawRows.length;
        index += 1
      ) {
        const rawRow =
          rawRows[index] ?? [];

        if (
          rawRow.length >
          DATA_IMPORT_LIMITS
            .MAX_COLUMNS
        ) {
          throw new DataImportFileError(
            `${sheetName} sayfasında en fazla ${DATA_IMPORT_LIMITS.MAX_COLUMNS} kolon olabilir.`
          );
        }

        const values =
          rawRow.map(
            normalizeCellValue
          );

        if (isEmptyRow(values)) {
          continue;
        }

        rows.push({
          sheetName,
          rowNumber:
            index + 1,
          values,
        });
      }

      const dataRowCount =
        Math.max(
          0,
          rows.length - 1
        );

      totalDataRows +=
        dataRowCount;

      if (
        totalDataRows >
        DATA_IMPORT_LIMITS
          .MAX_DATA_ROWS
      ) {
        throw new DataImportFileError(
          `Bir dosyada en fazla ${DATA_IMPORT_LIMITS.MAX_DATA_ROWS} veri satırı olabilir.`
        );
      }

      sheets.push({
        name: sheetName,
        rows,
      });
    }

    if (totalDataRows === 0) {
      throw new DataImportFileError(
        "Excel dosyasında aktarılacak veri satırı bulunamadı."
      );
    }

    return {
      fileName,
      fileSize:
        buffer.byteLength,
      fileHash:
        this.calculateFileHash(
          buffer
        ),
      sheetNames,
      sheets,
      totalDataRows,
    };
  }
}

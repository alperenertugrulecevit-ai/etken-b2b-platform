import "server-only";

import writeXlsxFile, {
  type SheetData,
} from "write-excel-file/node";

import {
  SUPPLIER_IMPORT_TEMPLATE,
} from "@/modules/data-import/constants/supplier-import.constants";

export class SupplierImportTemplateService {
  static async createBuffer() {
    const data:
      SheetData = [
      SUPPLIER_IMPORT_TEMPLATE
        .columns.map(
          (column) =>
            column.header
        ),
    ];

    return writeXlsxFile(
      data,
      {
        sheet:
          SUPPLIER_IMPORT_TEMPLATE
            .sheetName,

        columns:
          SUPPLIER_IMPORT_TEMPLATE
            .columns.map(
              (column) => ({
                width:
                  column.width,
              })
            ),
      }
    ).toBuffer();
  }
}

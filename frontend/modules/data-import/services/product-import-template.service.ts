import "server-only";

import writeXlsxFile, {
  type SheetData,
} from "write-excel-file/node";

import {
  PRODUCT_IMPORT_TEMPLATE,
} from "@/modules/data-import/constants/product-import.constants";

export class ProductImportTemplateService {
  static async createBuffer() {
    const data: SheetData = [
      PRODUCT_IMPORT_TEMPLATE.columns.map(
        (column) => column.header
      ),
    ];

    return writeXlsxFile(data, {
      sheet: PRODUCT_IMPORT_TEMPLATE.sheetName,

      columns:
        PRODUCT_IMPORT_TEMPLATE.columns.map(
          (column) => ({
            width: column.width,
          })
        ),
    }).toBuffer();
  }
}

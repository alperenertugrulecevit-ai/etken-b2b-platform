import "server-only";

import writeXlsxFile, {
  type SheetData,
} from "write-excel-file/node";

import {
  CUSTOMER_IMPORT_TEMPLATE,
} from "@/modules/data-import/constants/customer-import.constants";

export class CustomerImportTemplateService {
  static async createBuffer() {
    const customerData:
      SheetData = [
      CUSTOMER_IMPORT_TEMPLATE
        .customerColumns
        .map(
          (column) =>
            column.header
        ),
    ];

    const addressData:
      SheetData = [
      CUSTOMER_IMPORT_TEMPLATE
        .addressColumns
        .map(
          (column) =>
            column.header
        ),
    ];

    const customerColumns =
      CUSTOMER_IMPORT_TEMPLATE
        .customerColumns
        .map(
          (column) => ({
            width:
              column.width,
          })
        );

    const addressColumns =
      CUSTOMER_IMPORT_TEMPLATE
        .addressColumns
        .map(
          (column) => ({
            width:
              column.width,
          })
        );

    return writeXlsxFile([
      {
        data:
          customerData,

        sheet:
          CUSTOMER_IMPORT_TEMPLATE
            .customerSheetName,

        columns:
          customerColumns,

        stickyRowsCount:
          1,
      },

      {
        data:
          addressData,

        sheet:
          CUSTOMER_IMPORT_TEMPLATE
            .addressSheetName,

        columns:
          addressColumns,

        stickyRowsCount:
          1,
      },
    ]).toBuffer();
  }
}
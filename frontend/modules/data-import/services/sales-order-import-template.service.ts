import "server-only";

import writeXlsxFile, {
  type SheetData,
} from "write-excel-file/node";

import {
  SALES_ORDER_IMPORT_TEMPLATE,
} from "@/modules/data-import/constants/sales-order-import.constants";

export class SalesOrderImportTemplateService {
  static async createBuffer() {
    const orderData:
      SheetData = [
      SALES_ORDER_IMPORT_TEMPLATE
        .orderColumns
        .map(
          (column) =>
            column.header
        ),
    ];

    const lineData:
      SheetData = [
      SALES_ORDER_IMPORT_TEMPLATE
        .lineColumns
        .map(
          (column) =>
            column.header
        ),
    ];

    const orderColumns =
      SALES_ORDER_IMPORT_TEMPLATE
        .orderColumns
        .map(
          (column) => ({
            width:
              column.width,
          })
        );

    const lineColumns =
      SALES_ORDER_IMPORT_TEMPLATE
        .lineColumns
        .map(
          (column) => ({
            width:
              column.width,
          })
        );

    return writeXlsxFile([
      {
        data:
          orderData,

        sheet:
          SALES_ORDER_IMPORT_TEMPLATE
            .orderSheetName,

        columns:
          orderColumns,

        stickyRowsCount:
          1,
      },

      {
        data:
          lineData,

        sheet:
          SALES_ORDER_IMPORT_TEMPLATE
            .lineSheetName,

        columns:
          lineColumns,

        stickyRowsCount:
          1,
      },
    ]).toBuffer();
  }
}
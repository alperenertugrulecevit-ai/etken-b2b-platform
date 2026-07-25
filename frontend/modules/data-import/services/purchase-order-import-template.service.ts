import "server-only";

import writeXlsxFile, {
  type SheetData,
} from "write-excel-file/node";

import {
  PURCHASE_ORDER_IMPORT_TEMPLATE,
} from "@/modules/data-import/constants/purchase-order-import.constants";

export class PurchaseOrderImportTemplateService {
  static async createBuffer() {
    const orderData:
      SheetData = [
      PURCHASE_ORDER_IMPORT_TEMPLATE
        .orderColumns
        .map(
          (column) =>
            column.header
        ),
    ];

    const lineData:
      SheetData = [
      PURCHASE_ORDER_IMPORT_TEMPLATE
        .lineColumns
        .map(
          (column) =>
            column.header
        ),
    ];

    const orderColumns =
      PURCHASE_ORDER_IMPORT_TEMPLATE
        .orderColumns
        .map(
          (column) => ({
            width:
              column.width,
          })
        );

    const lineColumns =
      PURCHASE_ORDER_IMPORT_TEMPLATE
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
          PURCHASE_ORDER_IMPORT_TEMPLATE
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
          PURCHASE_ORDER_IMPORT_TEMPLATE
            .lineSheetName,

        columns:
          lineColumns,

        stickyRowsCount:
          1,
      },
    ]).toBuffer();
  }
}
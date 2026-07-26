import {
  AuthorizationService,
} from "@/modules/authorization/services/authorization.service";

import {
  SALES_ORDER_IMPORT_TEMPLATE,
} from "@/modules/data-import/constants/sales-order-import.constants";

import {
  SalesOrderImportTemplateService,
} from "@/modules/data-import/services/sales-order-import-template.service";

export async function GET() {
  await AuthorizationService.requirePermission(
    "DATA_IMPORT_VIEW"
  );

  const buffer =
    await SalesOrderImportTemplateService.createBuffer();

  return new Response(
    new Uint8Array(
      buffer
    ),
    {
      status:
        200,

      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition":
          `attachment; filename="${SALES_ORDER_IMPORT_TEMPLATE.fileName}"`,

        "Cache-Control":
          "private, no-store",
      },
    }
  );
}
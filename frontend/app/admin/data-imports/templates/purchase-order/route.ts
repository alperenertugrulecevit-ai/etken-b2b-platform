import {
  AuthorizationService,
} from "@/modules/authorization/services/authorization.service";

import {
  PURCHASE_ORDER_IMPORT_TEMPLATE,
} from "@/modules/data-import/constants/purchase-order-import.constants";

import {
  PurchaseOrderImportTemplateService,
} from "@/modules/data-import/services/purchase-order-import-template.service";

export async function GET() {
  await AuthorizationService.requirePermission(
    "DATA_IMPORT_VIEW"
  );

  const buffer =
    await PurchaseOrderImportTemplateService.createBuffer();

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
          `attachment; filename="${PURCHASE_ORDER_IMPORT_TEMPLATE.fileName}"`,

        "Cache-Control":
          "private, no-store",
      },
    }
  );
}
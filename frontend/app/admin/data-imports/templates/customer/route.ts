import {
  AuthorizationService,
} from "@/modules/authorization/services/authorization.service";

import {
  CUSTOMER_IMPORT_TEMPLATE,
} from "@/modules/data-import/constants/customer-import.constants";

import {
  CustomerImportTemplateService,
} from "@/modules/data-import/services/customer-import-template.service";

export async function GET() {
  await AuthorizationService.requirePermission(
    "DATA_IMPORT_VIEW"
  );

  const buffer =
    await CustomerImportTemplateService.createBuffer();

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
          `attachment; filename="${CUSTOMER_IMPORT_TEMPLATE.fileName}"`,

        "Cache-Control":
          "private, no-store",
      },
    }
  );
}
import {
  AuthorizationService,
} from "@/modules/authorization/services/authorization.service";

import {
  SUPPLIER_IMPORT_TEMPLATE,
} from "@/modules/data-import/constants/supplier-import.constants";

import {
  SupplierImportTemplateService,
} from "@/modules/data-import/services/supplier-import-template.service";

export async function GET() {
  await AuthorizationService.requirePermission(
    "DATA_IMPORT_VIEW"
  );

  const buffer =
    await SupplierImportTemplateService.createBuffer();

  return new Response(
    new Uint8Array(
      buffer
    ),
    {
      status: 200,

      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition":
          `attachment; filename="${SUPPLIER_IMPORT_TEMPLATE.fileName}"`,

        "Cache-Control":
          "private, no-store",
      },
    }
  );
}
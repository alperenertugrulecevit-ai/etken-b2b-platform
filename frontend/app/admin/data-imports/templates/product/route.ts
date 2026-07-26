import {
  AuthorizationService,
} from "@/modules/authorization/services/authorization.service";

import {
  PRODUCT_IMPORT_TEMPLATE,
} from "@/modules/data-import/constants/product-import.constants";

import {
  ProductImportTemplateService,
} from "@/modules/data-import/services/product-import-template.service";

export async function GET() {
  await AuthorizationService.requirePermission(
    "DATA_IMPORT_VIEW"
  );

  const buffer =
    await ProductImportTemplateService
      .createBuffer();

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
          `attachment; filename="${PRODUCT_IMPORT_TEMPLATE.fileName}"`,

        "Cache-Control":
          "private, no-store",
      },
    }
  );
}

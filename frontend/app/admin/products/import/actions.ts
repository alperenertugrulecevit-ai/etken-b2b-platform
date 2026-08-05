"use server";

import { revalidatePath } from "next/cache";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { ProductImportService } from "@/modules/products/import/product-import.service";

import type {
  ProductImportState,
} from "@/modules/products/import/product-import.types";

export async function importProductsFromExcel(
  _previousState: ProductImportState,
  formData: FormData
): Promise<ProductImportState> {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST"
  );

  const file = formData.get("productFile");

  if (!(file instanceof File)) {
    return {
      status: "error",
      message:
        "Lütfen içe aktarılacak Excel dosyasını seçin.",
      totalRows: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errors: [],
    };
  }

  if (file.size === 0) {
    return {
      status: "error",
      message:
        "Seçilen Excel dosyası boş.",
      totalRows: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errors: [],
    };
  }

  const maximumFileSize =
    5 * 1024 * 1024;

  if (file.size > maximumFileSize) {
    return {
      status: "error",
      message:
        "Excel dosyası 5 MB sınırını aşamaz.",
      totalRows: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errors: [],
    };
  }

  const result =
    await ProductImportService.importExcel(file);

  if (result.status === "success") {
    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath("/admin");
    revalidatePath("/admin/products");
    revalidatePath(
      "/admin/products/import"
    );
  }

  return result;
}
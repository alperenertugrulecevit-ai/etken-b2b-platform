"use server";

import { revalidatePath } from "next/cache";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { ProductImageService } from "@/modules/products/images/product-image.service";

import type {
  ProductImageUploadState,
} from "@/modules/products/images/product-image.types";

const MAXIMUM_FILE_COUNT = 100;

function errorState(
  message: string,
): ProductImageUploadState {
  return {
    status: "error",
    message,
    totalFiles: 0,
    uploadedCount: 0,
    notFoundCount: 0,
    invalidCount: 0,
    failedCount: 0,
    items: [],
  };
}

export async function uploadProductImages(
  _previousState: ProductImageUploadState,
  formData: FormData,
): Promise<ProductImageUploadState> {
  await AuthorizationService.requirePermission(
    "INVENTORY_ADJUST",
  );

  const files = formData
    .getAll("productImages")
    .filter(
      (value): value is File =>
        value instanceof File &&
        value.size > 0,
    );

  if (files.length === 0) {
    return errorState(
      "Lütfen en az bir ürün görseli seçin.",
    );
  }

  if (files.length > MAXIMUM_FILE_COUNT) {
    return errorState(
      `Tek işlemde en fazla ${MAXIMUM_FILE_COUNT} görsel yüklenebilir.`,
    );
  }

  const result =
    await ProductImageService.uploadFiles(
      files,
    );

  if (
    result.status === "success" ||
    result.status === "partial"
  ) {
    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath("/admin/products");
    revalidatePath(
      "/admin/product-images",
    );

    for (const item of result.items) {
      if (
        item.status === "uploaded" &&
        item.sku
      ) {
        revalidatePath(
          `/products/${item.sku}`,
        );
      }
    }
  }

  return result;
}
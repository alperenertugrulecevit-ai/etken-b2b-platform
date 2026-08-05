import { prisma } from "@/lib/prisma";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";

import { ProductImageStorageService } from "./product-image-storage.service";

import type {
  ProductImageUploadItem,
  ProductImageUploadState,
} from "./product-image.types";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAXIMUM_FILE_SIZE = 8 * 1024 * 1024;

function normalizeSkuFromFileName(
  fileName: string,
): string {
  return fileName
    .trim()
    .replace(
      /(?:\.(?:jpe?g|png|webp))+$/gi,
      "",
    )
    .trim()
    .toLocaleUpperCase("tr-TR");
}

function invalidFileItem(
  fileName: string,
  sku: string,
  message: string,
): ProductImageUploadItem {
  return {
    fileName,
    sku,
    status: "invalid_file",
    message,
    imageUrl: null,
  };
}

async function processFile(
  file: File,
): Promise<ProductImageUploadItem> {
  const fileName = file.name.trim();
  const sku = normalizeSkuFromFileName(fileName);

  if (!fileName) {
    return invalidFileItem(
      fileName,
      sku,
      "Dosya adı boş.",
    );
  }

  if (!sku) {
    return invalidFileItem(
      fileName,
      sku,
      "Dosya adından ürün SKU bilgisi okunamadı.",
    );
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return invalidFileItem(
      fileName,
      sku,
      "Yalnızca JPG, PNG veya WEBP görseller yüklenebilir.",
    );
  }

  if (file.size <= 0) {
    return invalidFileItem(
      fileName,
      sku,
      "Görsel dosyası boş.",
    );
  }

  if (file.size > MAXIMUM_FILE_SIZE) {
    return invalidFileItem(
      fileName,
      sku,
      "Görsel dosyası 8 MB sınırını aşıyor.",
    );
  }

  const product = await prisma.product.findFirst({
    where: {
      tenantId: B2B_CONSTANTS.TENANT_ID,
      companyId: B2B_CONSTANTS.COMPANY_ID,
      code: sku,
    },

    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  if (!product) {
    return {
      fileName,
      sku,
      status: "product_not_found",
      message:
        "Bu SKU ile eşleşen ürün bulunamadı.",
      imageUrl: null,
    };
  }

  try {
    const sourceBuffer = Buffer.from(
      await file.arrayBuffer(),
    );

    const imageUrl =
      await ProductImageStorageService.store(
        product.code,
        sourceBuffer,
      );

    await prisma.product.update({
      where: {
        id: product.id,
      },

      data: {
        imageUrl,
      },
    });

    return {
      fileName,
      sku: product.code,
      status: "uploaded",
      message: `${product.name} görseli başarıyla yüklendi.`,
      imageUrl,
    };
  } catch (error) {
    console.error(
      `Product image upload failed for ${sku}:`,
      error,
    );

    return {
      fileName,
      sku,
      status: "upload_failed",
      message:
        error instanceof Error
          ? error.message
          : "Görsel yüklenirken bilinmeyen bir hata oluştu.",
      imageUrl: null,
    };
  }
}

export class ProductImageService {
  static async uploadFiles(
    files: File[],
  ): Promise<ProductImageUploadState> {
    if (files.length === 0) {
      return {
        status: "error",
        message:
          "Lütfen en az bir ürün görseli seçin.",
        totalFiles: 0,
        uploadedCount: 0,
        notFoundCount: 0,
        invalidCount: 0,
        failedCount: 0,
        items: [],
      };
    }

    const duplicateSkuSet = new Set<string>();
    const encounteredSkuSet = new Set<string>();

    const items: ProductImageUploadItem[] = [];

    for (const file of files) {
      const sku = normalizeSkuFromFileName(
        file.name,
      );

      if (
        sku &&
        encounteredSkuSet.has(sku)
      ) {
        duplicateSkuSet.add(sku);

        items.push(
          invalidFileItem(
            file.name,
            sku,
            "Aynı SKU için birden fazla görsel seçildi.",
          ),
        );

        continue;
      }

      if (sku) {
        encounteredSkuSet.add(sku);
      }

      const item = await processFile(file);

      items.push(item);
    }

    if (duplicateSkuSet.size > 0) {
      console.warn(
        "Duplicate product image SKUs:",
        Array.from(duplicateSkuSet),
      );
    }

    const uploadedCount = items.filter(
      (item) =>
        item.status === "uploaded",
    ).length;

    const notFoundCount = items.filter(
      (item) =>
        item.status ===
        "product_not_found",
    ).length;

    const invalidCount = items.filter(
      (item) =>
        item.status === "invalid_file",
    ).length;

    const failedCount = items.filter(
      (item) =>
        item.status === "upload_failed",
    ).length;

    const errorCount =
      notFoundCount +
      invalidCount +
      failedCount;

    const status =
      uploadedCount === files.length
        ? "success"
        : uploadedCount > 0
          ? "partial"
          : "error";

    const message =
      status === "success"
        ? "Tüm ürün görselleri başarıyla yüklendi."
        : status === "partial"
          ? "Bazı görseller yüklendi, bazı dosyalar işlenemedi."
          : "Hiçbir ürün görseli yüklenemedi.";

    return {
      status,
      message,
      totalFiles: files.length,
      uploadedCount,
      notFoundCount,
      invalidCount,
      failedCount,
      items,
    };
  }
}
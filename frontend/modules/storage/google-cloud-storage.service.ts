import { createHash } from "node:crypto";

import { Storage } from "@google-cloud/storage";

const storage = new Storage();

function getBucketName(): string {
  const bucketName =
    process.env.PRODUCT_ASSETS_BUCKET?.trim();

  if (!bucketName) {
    throw new Error(
      "PRODUCT_ASSETS_BUCKET ortam değişkeni tanımlı değil.",
    );
  }

  return bucketName;
}

function sanitizeFileName(
  value: string,
): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function guessExtension(
  contentType: string | null,
  sourceUrl: string,
): string {
  const normalizedContentType =
    contentType
      ?.split(";")[0]
      ?.trim()
      .toLocaleLowerCase("en-US");

  if (
    normalizedContentType ===
    "image/jpeg"
  ) {
    return "jpg";
  }

  if (
    normalizedContentType ===
    "image/png"
  ) {
    return "png";
  }

  if (
    normalizedContentType ===
    "image/webp"
  ) {
    return "webp";
  }

  if (
    normalizedContentType ===
    "image/gif"
  ) {
    return "gif";
  }

  try {
    const pathname =
      new URL(sourceUrl).pathname;

    const extension =
      pathname
        .split(".")
        .pop()
        ?.toLocaleLowerCase(
          "en-US",
        );

    if (
      extension &&
      [
        "jpg",
        "jpeg",
        "png",
        "webp",
        "gif",
      ].includes(extension)
    ) {
      return extension === "jpeg"
        ? "jpg"
        : extension;
    }
  } catch {
    // JPG fallback kullanılacak.
  }

  return "jpg";
}

function createSourceHash(
  sourceUrl: string,
): string {
  return createHash("sha256")
    .update(sourceUrl)
    .digest("hex")
    .slice(0, 12);
}

export type StoreProductImageInput = {
  tenantId: string;
  companyId: string;

  productId: number;
  productCode: string;

  sourceUrl: string;

  sortOrder: number;
};

export type StoreProductImageResult = {
  bucketName: string;
  objectName: string;
  publicUrl: string;

  contentType: string | null;
  size: number;
};

export class GoogleCloudStorageService {
  static async storeProductImage(
    input: StoreProductImageInput,
  ): Promise<StoreProductImageResult> {
    const bucketName =
      getBucketName();

    const response =
      await fetch(
        input.sourceUrl,
        {
          method: "GET",

          headers: {
            "user-agent":
              "Mozilla/5.0 (compatible; EtkenOfficeProductAssets/1.0; +https://etkenofis.com)",

            accept:
              "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          },

          redirect: "follow",

          cache: "no-store",
        },
      );

    if (!response.ok) {
      throw new Error(
        `Ürün görseli indirilemedi. HTTP ${response.status}.`,
      );
    }

    const contentType =
      response.headers
        .get("content-type")
        ?.split(";")[0]
        ?.trim() ??
      null;

    if (
      !contentType ||
      !contentType
        .toLocaleLowerCase(
          "en-US",
        )
        .startsWith("image/")
    ) {
      throw new Error(
        "Kaynak URL geçerli bir görsel döndürmedi.",
      );
    }

    const arrayBuffer =
      await response.arrayBuffer();

    const buffer =
      Buffer.from(
        arrayBuffer,
      );

    if (buffer.length === 0) {
      throw new Error(
        "İndirilen ürün görseli boş.",
      );
    }

    if (
      buffer.length >
      15 * 1024 * 1024
    ) {
      throw new Error(
        "Ürün görseli 15 MB sınırını aşıyor.",
      );
    }

    const extension =
      guessExtension(
        contentType,
        input.sourceUrl,
      );

    const safeProductCode =
      sanitizeFileName(
        input.productCode,
      ) ||
      `product-${input.productId}`;

    const sourceHash =
      createSourceHash(
        input.sourceUrl,
      );

    const objectName =
      [
        "product-images",
        input.tenantId,
        input.companyId,
        String(
          input.productId,
        ),
        `${safeProductCode}-${String(
          input.sortOrder + 1,
        ).padStart(
          2,
          "0",
        )}-${sourceHash}.${extension}`,
      ].join("/");

    const bucket =
      storage.bucket(
        bucketName,
      );

    const file =
      bucket.file(
        objectName,
      );

    await file.save(
      buffer,
      {
        resumable: false,

        contentType,

        metadata: {
          cacheControl:
            "public, max-age=31536000, immutable",

          metadata: {
            sourceUrl:
              input.sourceUrl,

            productId:
              String(
                input.productId,
              ),

            productCode:
              input.productCode,
          },
        },
      },
    );

    const publicUrl =
      `https://storage.googleapis.com/${bucketName}/${objectName
        .split("/")
        .map(
          (part) =>
            encodeURIComponent(
              part,
            ),
        )
        .join("/")}`;

    return {
      bucketName,
      objectName,
      publicUrl,

      contentType,

      size:
        buffer.length,
    };
  }
}
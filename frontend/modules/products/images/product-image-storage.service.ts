import { Storage } from "@google-cloud/storage";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUTPUT_SIZE = 1000;
const WEBP_QUALITY = 85;

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

function buildCloudPublicUrl(
  bucketName: string,
  objectName: string,
): string {
  const encodedObjectName = objectName
    .split("/")
    .map((segment) =>
      encodeURIComponent(segment),
    )
    .join("/");

  return `https://storage.googleapis.com/${bucketName}/${encodedObjectName}`;
}

async function optimizeImage(
  inputBuffer: Buffer,
): Promise<Buffer> {
  return sharp(inputBuffer)
    .rotate()
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, {
      fit: "contain",
      background: {
        r: 255,
        g: 255,
        b: 255,
        alpha: 1,
      },
      withoutEnlargement: true,
    })
    .flatten({
      background: {
        r: 255,
        g: 255,
        b: 255,
      },
    })
    .webp({
      quality: WEBP_QUALITY,
      effort: 4,
    })
    .toBuffer();
}

async function saveLocally(
  sku: string,
  optimizedBuffer: Buffer,
): Promise<string> {
  const productsDirectory = path.join(
    process.cwd(),
    "public",
    "products",
  );

  await mkdir(productsDirectory, {
    recursive: true,
  });

  const fileName = `${sku}.webp`;

  await writeFile(
    path.join(productsDirectory, fileName),
    optimizedBuffer,
  );

  return `/products/${fileName}`;
}

async function saveToCloudStorage(
  sku: string,
  optimizedBuffer: Buffer,
): Promise<string> {
  const bucketName = getBucketName();
  const objectName = `products/${sku}.webp`;

  const bucket = storage.bucket(bucketName);
  const object = bucket.file(objectName);

  await object.save(optimizedBuffer, {
    resumable: false,
    validation: "crc32c",

    metadata: {
      contentType: "image/webp",

      cacheControl:
        "public, max-age=31536000, immutable",

      metadata: {
        productSku: sku,
        uploadedBy: "etken-b2b-product-image-manager",
      },
    },
  });

  return buildCloudPublicUrl(
    bucketName,
    objectName,
  );
}

export class ProductImageStorageService {
  static async store(
    sku: string,
    sourceBuffer: Buffer,
  ): Promise<string> {
    const optimizedBuffer =
      await optimizeImage(sourceBuffer);

    /*
     * Yerel geliştirmede public/products kullanılır.
     * Canlı Cloud Run ortamında kalıcı Cloud Storage
     * bucket'ına yazılır.
     */
    if (process.env.NODE_ENV !== "production") {
      return saveLocally(
        sku,
        optimizedBuffer,
      );
    }

    return saveToCloudStorage(
      sku,
      optimizedBuffer,
    );
  }
}
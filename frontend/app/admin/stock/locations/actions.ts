"use server";

import {
  Prisma,
} from "@prisma/client";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export type LocationStockPlacementState = {
  success: boolean;
  message: string;
};

export async function placeStockToLocation(
  _previousState: LocationStockPlacementState,
  formData: FormData
): Promise<LocationStockPlacementState> {
  const productId = Number(
    formData.get("productId")
  );

  const warehouseId = Number(
    formData.get("warehouseId")
  );

  const locationId = Number(
    formData.get("locationId")
  );

  const quantity = Number(
    formData.get("quantity")
  );

  if (
    !Number.isInteger(productId) ||
    productId <= 0
  ) {
    return {
      success: false,
      message:
        "Lütfen geçerli bir ürün seçin.",
    };
  }

  if (
    !Number.isInteger(warehouseId) ||
    warehouseId <= 0
  ) {
    return {
      success: false,
      message:
        "Lütfen geçerli bir depo seçin.",
    };
  }

  if (
    !Number.isInteger(locationId) ||
    locationId <= 0
  ) {
    return {
      success: false,
      message:
        "Lütfen geçerli bir lokasyon seçin.",
    };
  }

  if (
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    return {
      success: false,
      message:
        "Yerleştirme miktarı sıfırdan büyük bir tam sayı olmalıdır.",
    };
  }

  try {
    const result =
      await prisma.$transaction(
        async (tx) => {
          const product =
            await tx.product.findUnique({
              where: {
                id: productId,
              },

              select: {
                id: true,
                code: true,
                name: true,
                stock: true,
                isActive: true,
              },
            });

          if (!product) {
            throw new Error(
              "Yerleştirilecek ürün bulunamadı."
            );
          }

          if (!product.isActive) {
            throw new Error(
              `${product.code} - ${product.name} ürünü pasif durumda.`
            );
          }

          if (product.stock <= 0) {
            throw new Error(
              `${product.code} - ${product.name} ürününde yerleştirilebilecek fiziksel stok bulunmuyor.`
            );
          }

          const warehouse =
            await tx.warehouse.findUnique({
              where: {
                id: warehouseId,
              },

              select: {
                id: true,
                code: true,
                name: true,
                isActive: true,
              },
            });

          if (!warehouse) {
            throw new Error(
              "Seçilen depo bulunamadı."
            );
          }

          if (!warehouse.isActive) {
            throw new Error(
              `${warehouse.code} - ${warehouse.name} deposu pasif durumda.`
            );
          }

          const location =
            await tx.warehouseLocation.findFirst({
              where: {
                id: locationId,
                warehouseId,
              },

              select: {
                id: true,
                code: true,
                section: true,
                level: true,
                bin: true,
                isActive: true,
              },
            });

          if (!location) {
            throw new Error(
              "Seçilen lokasyon bu depoya ait değil veya bulunamadı."
            );
          }

          if (!location.isActive) {
            throw new Error(
              "Pasif lokasyona stok yerleştirilemez."
            );
          }

          const allocatedSummary =
            await tx.warehouseLocationStock.aggregate({
              where: {
                productId,
              },

              _sum: {
                quantity: true,
              },
            });

          const allocatedQuantity =
            allocatedSummary._sum.quantity ??
            0;

          const unallocatedQuantity =
            product.stock -
            allocatedQuantity;

          if (unallocatedQuantity <= 0) {
            throw new Error(
              `${product.code} - ${product.name} ürününün fiziksel stoğunun tamamı lokasyonlara yerleştirilmiş.`
            );
          }

          if (
            quantity >
            unallocatedQuantity
          ) {
            throw new Error(
              `${product.code} - ${product.name} için yerleştirilmemiş stok yetersiz. ` +
                `Yerleştirilmemiş stok: ${unallocatedQuantity}, ` +
                `girilen miktar: ${quantity}.`
            );
          }

          const locationStock =
            await tx.warehouseLocationStock.upsert({
              where: {
                location_product_unique: {
                  locationId,
                  productId,
                },
              },

              update: {
                quantity: {
                  increment: quantity,
                },
              },

              create: {
                locationId,
                productId,
                quantity,
                reservedStock: 0,
              },

              select: {
                id: true,
                quantity: true,
              },
            });

          return {
            productCode:
              product.code,

            productName:
              product.name,

            locationCode: [
              location.code,
              location.section,
              location.level,
              location.bin,
            ]
              .filter(Boolean)
              .join("-"),

            placedQuantity:
              quantity,

            locationQuantity:
              locationStock.quantity,

            remainingQuantity:
              unallocatedQuantity -
              quantity,
          };
        },
        {
          maxWait: 10000,
          timeout: 20000,
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        }
      );

    revalidatePath("/admin");
    revalidatePath(
      "/admin/products"
    );
    revalidatePath(
      "/admin/warehouses"
    );
    revalidatePath(
      "/admin/stock/locations"
    );

    return {
      success: true,
      message:
        `${result.productCode} - ${result.productName} ürününden ` +
        `${result.placedQuantity} adet ${result.locationCode} lokasyonuna yerleştirildi. ` +
        `Lokasyon bakiyesi: ${result.locationQuantity}. ` +
        `Yerleştirilmemiş stok: ${result.remainingQuantity}.`,
    };
  } catch (error) {
    console.error(
      "Lokasyona stok yerleştirme hatası:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Stok lokasyona yerleştirilirken beklenmeyen bir hata oluştu.",
    };
  }
}
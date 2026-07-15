"use server";

import {
  HandlingUnitStatus,
  Prisma,
} from "@prisma/client";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export type HandlingUnitProductActionState = {
  success: boolean;
  message: string;
};

function normalizeBarcode(
  value: FormDataEntryValue | null
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

export async function addProductToHandlingUnit(
  handlingUnitId: number,
  _previousState: HandlingUnitProductActionState,
  formData: FormData
): Promise<HandlingUnitProductActionState> {
  if (
    !Number.isInteger(handlingUnitId) ||
    handlingUnitId <= 0
  ) {
    return {
      success: false,
      message:
        "Geçerli bir koli veya palet bulunamadı.",
    };
  }

  const productBarcode =
    normalizeBarcode(
      formData.get("productBarcode")
    );

  const quantity = Number(
    formData.get("quantity")
  );

  if (!productBarcode) {
    return {
      success: false,
      message:
        "Ürün barkodunu okutun veya yazın.",
    };
  }

  if (
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    return {
      success: false,
      message:
        "Miktar sıfırdan büyük bir tam sayı olmalıdır.",
    };
  }

  try {
    const result =
      await prisma.$transaction(
        async (tx) => {
          const handlingUnit =
            await tx.handlingUnit.findUnique({
              where: {
                id: handlingUnitId,
              },

              select: {
                id: true,
                barcode: true,
                status: true,
                parentUnitId: true,
              },
            });

          if (!handlingUnit) {
            throw new Error(
              "Koli veya palet bulunamadı."
            );
          }

          if (
            handlingUnit.status !==
              HandlingUnitStatus.OPEN &&
            handlingUnit.status !==
              HandlingUnitStatus.EMPTY
          ) {
            throw new Error(
              `${handlingUnit.barcode} barkodlu taşıma birimi açık durumda değil. Ürün yüklemek için önce birimi açın.`
            );
          }

          const product =
            await tx.product.findFirst({
              where: {
                isActive: true,

                OR: [
                  {
                    barcode:
                      productBarcode,
                  },

                  {
                    code:
                      productBarcode,
                  },
                ],
              },

              select: {
                id: true,
                code: true,
                barcode: true,
                name: true,
                stock: true,
              },
            });

          if (!product) {
            throw new Error(
              `${productBarcode} barkoduyla aktif ürün bulunamadı.`
            );
          }

          if (product.stock <= 0) {
            throw new Error(
              `${product.code} - ${product.name} ürününde fiziksel stok bulunmuyor.`
            );
          }

          const [
            locationStockSummary,
            handlingUnitStockSummary,
          ] = await Promise.all([
            tx.warehouseLocationStock.aggregate({
              where: {
                productId:
                  product.id,
              },

              _sum: {
                quantity: true,
              },
            }),

            tx.handlingUnitItem.aggregate({
              where: {
                productId:
                  product.id,
              },

              _sum: {
                quantity: true,
              },
            }),
          ]);

          const allocatedToLocations =
            locationStockSummary._sum
              .quantity ?? 0;

          const allocatedToHandlingUnits =
            handlingUnitStockSummary._sum
              .quantity ?? 0;

          const totalAllocated =
            allocatedToLocations +
            allocatedToHandlingUnits;

          const unallocatedStock =
            product.stock -
            totalAllocated;

          if (unallocatedStock <= 0) {
            throw new Error(
              `${product.code} - ${product.name} ürününün fiziksel stoğunun tamamı lokasyonlara veya koli/paletlere dağıtılmış.`
            );
          }

          if (quantity > unallocatedStock) {
            throw new Error(
              `${product.code} - ${product.name} için dağıtılmamış stok yetersiz. ` +
                `Fiziksel stok: ${product.stock}, ` +
                `lokasyonlardaki stok: ${allocatedToLocations}, ` +
                `koli/paletlerdeki stok: ${allocatedToHandlingUnits}, ` +
                `yüklenebilir stok: ${unallocatedStock}, ` +
                `girilen miktar: ${quantity}.`
            );
          }

          const handlingUnitItem =
            await tx.handlingUnitItem.upsert({
              where: {
                handling_unit_product_unique:
                  {
                    handlingUnitId,
                    productId:
                      product.id,
                  },
              },

              update: {
                quantity: {
                  increment: quantity,
                },
              },

              create: {
                handlingUnitId,
                productId:
                  product.id,
                quantity,
                reservedStock: 0,
              },

              select: {
                id: true,
                quantity: true,
              },
            });

          if (
            handlingUnit.status ===
            HandlingUnitStatus.EMPTY
          ) {
            await tx.handlingUnit.update({
              where: {
                id: handlingUnitId,
              },

              data: {
                status:
                  HandlingUnitStatus.OPEN,
              },
            });
          }

          return {
            handlingUnitBarcode:
              handlingUnit.barcode,

            productCode:
              product.code,

            productName:
              product.name,

            addedQuantity:
              quantity,

            handlingUnitQuantity:
              handlingUnitItem.quantity,

            remainingUnallocatedStock:
              unallocatedStock -
              quantity,
          };
        },
        {
          maxWait: 10000,
          timeout: 20000,
          isolationLevel:
            Prisma.TransactionIsolationLevel
              .Serializable,
        }
      );

    revalidatePath(
      "/admin/handling-units"
    );

    revalidatePath(
      `/admin/handling-units/${handlingUnitId}`
    );

    revalidatePath(
      "/admin/stock/locations"
    );

    return {
      success: true,
      message:
        `${result.productCode} - ${result.productName} ürününden ` +
        `${result.addedQuantity} adet ${result.handlingUnitBarcode} içine yüklendi. ` +
        `Birim içindeki miktar: ${result.handlingUnitQuantity}. ` +
        `Dağıtılmamış stok: ${result.remainingUnallocatedStock}.`,
    };
  } catch (error) {
    console.error(
      "Koli/palete ürün yükleme hatası:",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return {
        success: false,
        message:
          "Aynı stok üzerinde başka bir işlem yapıldı. Lütfen işlemi tekrar deneyin.",
      };
    }

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Ürün koli veya palete yüklenirken beklenmeyen bir hata oluştu.",
    };
  }
}

export async function removeProductFromHandlingUnit(
  handlingUnitId: number,
  handlingUnitItemId: number,
  formData: FormData
) {
  const quantity = Number(
    formData.get("quantity")
  );

  if (
    !Number.isInteger(handlingUnitId) ||
    handlingUnitId <= 0 ||
    !Number.isInteger(handlingUnitItemId) ||
    handlingUnitItemId <= 0 ||
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      const item =
        await tx.handlingUnitItem.findFirst({
          where: {
            id: handlingUnitItemId,
            handlingUnitId,
          },

          select: {
            id: true,
            quantity: true,
            reservedStock: true,

            handlingUnit: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        });

      if (!item) {
        throw new Error(
          "Taşıma birimi ürün satırı bulunamadı."
        );
      }

      if (
        item.handlingUnit.status !==
          HandlingUnitStatus.OPEN &&
        item.handlingUnit.status !==
          HandlingUnitStatus.EMPTY
      ) {
        throw new Error(
          "Yalnızca açık taşıma birimlerinden ürün çıkarılabilir."
        );
      }

      const availableQuantity =
        item.quantity -
        item.reservedStock;

      if (quantity > availableQuantity) {
        throw new Error(
          `Çıkarılabilir miktar yetersiz. Kullanılabilir miktar: ${availableQuantity}.`
        );
      }

      const remainingQuantity =
        item.quantity -
        quantity;

      if (remainingQuantity === 0) {
        await tx.handlingUnitItem.delete({
          where: {
            id: item.id,
          },
        });
      } else {
        await tx.handlingUnitItem.update({
          where: {
            id: item.id,
          },

          data: {
            quantity:
              remainingQuantity,
          },
        });
      }

      const remainingItems =
        await tx.handlingUnitItem.count({
          where: {
            handlingUnitId,
            quantity: {
              gt: 0,
            },
          },
        });

      const childUnitCount =
        await tx.handlingUnit.count({
          where: {
            parentUnitId:
              handlingUnitId,
          },
        });

      if (
        remainingItems === 0 &&
        childUnitCount === 0
      ) {
        await tx.handlingUnit.update({
          where: {
            id: handlingUnitId,
          },

          data: {
            status:
              HandlingUnitStatus.EMPTY,
          },
        });
      }
    },
    {
      maxWait: 10000,
      timeout: 20000,
      isolationLevel:
        Prisma.TransactionIsolationLevel
          .Serializable,
    }
  );

  revalidatePath(
    "/admin/handling-units"
  );

  revalidatePath(
    `/admin/handling-units/${handlingUnitId}`
  );

  revalidatePath(
    "/admin/stock/locations"
  );
}
"use server";

import { StockMovementType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { createStockMovementWithTransaction } from "@/lib/stock/stock-service";

export type ManualStockActionState = {
  success: boolean;
  message: string;
  productId?: number;
};

const allowedMovementTypes = [
  StockMovementType.INITIAL_STOCK,
  StockMovementType.PURCHASE_RECEIPT,
  StockMovementType.MANUAL_IN,
  StockMovementType.MANUAL_OUT,
  StockMovementType.COUNT_INCREASE,
  StockMovementType.COUNT_DECREASE,
  StockMovementType.SALE_RETURN,
] as const;

type AllowedMovementType =
  (typeof allowedMovementTypes)[number];

function isAllowedMovementType(
  value: string
): value is AllowedMovementType {
  return allowedMovementTypes.includes(
    value as AllowedMovementType
  );
}

function getPhysicalChange(
  movementType: AllowedMovementType,
  quantity: number
) {
  const incomingTypes: AllowedMovementType[] = [
    StockMovementType.INITIAL_STOCK,
    StockMovementType.PURCHASE_RECEIPT,
    StockMovementType.MANUAL_IN,
    StockMovementType.COUNT_INCREASE,
    StockMovementType.SALE_RETURN,
  ];

  return incomingTypes.includes(movementType)
    ? quantity
    : -quantity;
}

function getDefaultDescription(
  movementType: AllowedMovementType
) {
  const descriptions: Record<
    AllowedMovementType,
    string
  > = {
    INITIAL_STOCK:
      "Ürün için açılış stoğu kaydedildi.",

    PURCHASE_RECEIPT:
      "Mal kabul işlemiyle stok girişi yapıldı.",

    MANUAL_IN:
      "Manuel stok girişi yapıldı.",

    MANUAL_OUT:
      "Manuel stok çıkışı yapıldı.",

    COUNT_INCREASE:
      "Sayım fazlası nedeniyle stok artırıldı.",

    COUNT_DECREASE:
      "Sayım eksiği nedeniyle stok azaltıldı.",

    SALE_RETURN:
      "Satış iadesi nedeniyle stok girişi yapıldı.",
  };

  return descriptions[movementType];
}

export async function createManualStockMovement(
  _previousState: ManualStockActionState,
  formData: FormData
): Promise<ManualStockActionState> {
  const productId = Number(
    formData.get("productId")
  );

  const movementTypeValue = String(
    formData.get("movementType") ?? ""
  ).trim();

  const quantity = Number(
    formData.get("quantity")
  );

  const documentNumber =
    String(
      formData.get("documentNumber") ?? ""
    ).trim() || null;

  const enteredDescription =
    String(
      formData.get("description") ?? ""
    ).trim();

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
    !isAllowedMovementType(
      movementTypeValue
    )
  ) {
    return {
      success: false,
      message:
        "Lütfen geçerli bir stok hareket tipi seçin.",
      productId,
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
      productId,
    };
  }

  const movementType =
    movementTypeValue;

  const physicalChange =
    getPhysicalChange(
      movementType,
      quantity
    );

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
                reservedStock: true,
                isActive: true,
              },
            });

          if (!product) {
            return {
              error:
                "Stok işlemi yapılacak ürün bulunamadı.",
            };
          }

          if (!product.isActive) {
            return {
              error:
                `${product.code} - ${product.name} ürünü pasif durumda.`,
            };
          }

          const availableStock =
            product.stock -
            product.reservedStock;

          if (
            physicalChange < 0 &&
            product.stock < quantity
          ) {
            return {
              error:
                `${product.code} - ${product.name} için fiziksel stok yetersiz. ` +
                `Mevcut fiziksel stok: ${product.stock}, ` +
                `istenen çıkış: ${quantity}.`,
            };
          }

          if (
            physicalChange < 0 &&
            availableStock < quantity
          ) {
            return {
              error:
                `${product.code} - ${product.name} için kullanılabilir stok yetersiz. ` +
                `Fiziksel stok: ${product.stock}, ` +
                `rezerve stok: ${product.reservedStock}, ` +
                `kullanılabilir stok: ${availableStock}, ` +
                `istenen çıkış: ${quantity}.`,
            };
          }

          await createStockMovementWithTransaction(
            tx,
            {
              productId,

              movementType,

              physicalChange,

              reservedChange: 0,

              documentNumber,

              description:
                enteredDescription ||
                getDefaultDescription(
                  movementType
                ),
            }
          );

          return {
            product,
            error: null,
          };
        },
        {
          maxWait: 10000,
          timeout: 20000,
        }
      );

    if (result.error) {
      return {
        success: false,
        message: result.error,
        productId,
      };
    }

    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath("/admin");
    revalidatePath("/admin/products");
    revalidatePath(
      `/admin/products/${productId}`
    );
    revalidatePath(
      "/admin/stock/manual"
    );

if (!result.product) {
  return {
    success: false,
    productId,
    message: "Ürün bilgisi bulunamadı.",
  };
}

return {
  success: true,
  productId,
  message: `${result.product.code} - ${result.product.name} için stok hareketi başarıyla kaydedildi.`,
};
  } catch (error) {
    console.error(
      "Manuel stok işlemi hatası:",
      error
    );

    return {
      success: false,
      productId,
      message:
        error instanceof Error
          ? error.message
          : "Stok hareketi kaydedilirken beklenmeyen bir hata oluştu.",
    };
  }
}
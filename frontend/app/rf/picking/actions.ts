"use server";

import {
  HandlingUnitPurpose,
  HandlingUnitStatus,
  OrderStatus,
  Prisma,
} from "@prisma/client";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

export type RFPickingState = {
  success: boolean;
  message: string;

  orderId: number | null;
  orderNumber: string;
  orderStatus: string;

  orderItemId: number | null;

  productId: number | null;
  productCode: string;
  productBarcode: string;
  productName: string;

  sourceUnitId: number | null;
  sourceBarcode: string;
  sourceQuantityAfter: number;

  targetUnitId: number | null;
  targetBarcode: string;
  targetQuantityAfter: number;

  pickedQuantity: number;
  linePickedQuantity: number;
  lineRemainingQuantity: number;

  orderPickedQuantity: number;
  orderTotalQuantity: number;
  orderRemainingQuantity: number;
  progressPercentage: number;

  pickingCompleted: boolean;
};

const emptyState: RFPickingState = {
  success: false,
  message: "",

  orderId: null,
  orderNumber: "",
  orderStatus: "",

  orderItemId: null,

  productId: null,
  productCode: "",
  productBarcode: "",
  productName: "",

  sourceUnitId: null,
  sourceBarcode: "",
  sourceQuantityAfter: 0,

  targetUnitId: null,
  targetBarcode: "",
  targetQuantityAfter: 0,

  pickedQuantity: 0,
  linePickedQuantity: 0,
  lineRemainingQuantity: 0,

  orderPickedQuantity: 0,
  orderTotalQuantity: 0,
  orderRemainingQuantity: 0,
  progressPercentage: 0,

  pickingCompleted: false,
};

function createErrorState(
  message: string
): RFPickingState {
  return {
    ...emptyState,
    message,
  };
}

function normalizeValue(
  value: FormDataEntryValue | null
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function createFullLocationCode({
  code,
  section,
  level,
  bin,
}: {
  code: string;
  section: string;
  level: string;
  bin: string;
}) {
  return [
    code,
    section,
    level,
    bin,
  ]
    .filter(Boolean)
    .join("-")
    .toUpperCase();
}

function getOrderStatusLabel(
  status: OrderStatus
) {
  const labels: Record<
    OrderStatus,
    string
  > = {
    DRAFT: "Taslak",
    PENDING: "Bekliyor",
    APPROVED: "Onaylandı",
    PREPARING: "Hazırlanıyor",
    PICKING: "Toplanıyor",
    PACKING: "Paketleniyor",
    READY_TO_SHIP: "Sevke Hazır",
    SHIPPED: "Sevk Edildi",
    DELIVERED: "Teslim Edildi",
    CANCELLED: "İptal",
  };

  return labels[status];
}

function canPickOrder(
  status: OrderStatus
) {
  return (
    status === OrderStatus.APPROVED ||
    status === OrderStatus.PREPARING ||
    status === OrderStatus.PICKING
  );
}

function canUseSourceStatus(
  status: HandlingUnitStatus
) {
  return (
    status === HandlingUnitStatus.OPEN ||
    status === HandlingUnitStatus.CLOSED ||
    status === HandlingUnitStatus.STORED
  );
}

function canUseTargetStatus(
  status: HandlingUnitStatus
) {
  return (
    status === HandlingUnitStatus.OPEN ||
    status === HandlingUnitStatus.EMPTY ||
    status === HandlingUnitStatus.STORED
  );
}

export async function rfPickOrderItem(
  _previousState: RFPickingState,
  formData: FormData
): Promise<RFPickingState> {
  const orderNumber =
    normalizeValue(
      formData.get("orderNumber")
    );

  const targetBarcode =
    normalizeValue(
      formData.get("targetBarcode")
    );

  const locationBarcode =
    normalizeValue(
      formData.get("locationBarcode")
    );

  const sourceBarcode =
    normalizeValue(
      formData.get("sourceBarcode")
    );

  const productBarcode =
    normalizeValue(
      formData.get("productBarcode")
    );

  const quantity = Number(
    formData.get("quantity")
  );

  if (!orderNumber) {
    return createErrorState(
      "Toplanacak sipariş numarasını okutun."
    );
  }

  if (!targetBarcode) {
    return createErrorState(
      "Hedef toplama koli veya paletini okutun."
    );
  }

  if (!locationBarcode) {
    return createErrorState(
      "Kaynak lokasyon barkodunu okutun."
    );
  }

  if (!sourceBarcode) {
    return createErrorState(
      "Kaynak stok koli veya paletini okutun."
    );
  }

  if (!productBarcode) {
    return createErrorState(
      "Toplanacak ürün barkodunu okutun."
    );
  }

  if (
    sourceBarcode === targetBarcode
  ) {
    return createErrorState(
      "Kaynak ve hedef taşıma birimi aynı olamaz."
    );
  }

  if (
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    return createErrorState(
      "Toplama miktarı sıfırdan büyük bir tam sayı olmalıdır."
    );
  }

  try {
    const result =
      await prisma.$transaction(
        async (tx) => {
          const order =
            await tx.order.findUnique({
              where: {
                orderNumber,
              },

              select: {
                id: true,
                orderNumber: true,
                status: true,
                stockReserved: true,
                stockDeducted: true,

                customer: {
                  select: {
                    companyName: true,
                  },
                },

                items: {
                  orderBy: {
                    id: "asc",
                  },

                  select: {
                    id: true,
                    productId: true,
                    productCode: true,
                    productName: true,
                    quantity: true,
                    pickedQuantity: true,

                    product: {
                      select: {
                        id: true,
                        code: true,
                        barcode: true,
                        name: true,
                        isActive: true,
                      },
                    },
                  },
                },
              },
            });

          if (!order) {
            throw new Error(
              `${orderNumber} numaralı sipariş bulunamadı.`
            );
          }

          if (
            !canPickOrder(order.status)
          ) {
            throw new Error(
              `${order.orderNumber} siparişi toplama işlemine uygun değildir.`
            );
          }

          if (!order.stockReserved) {
            throw new Error(
              `${order.orderNumber} siparişinde stok rezervasyonu bulunmuyor.`
            );
          }

          if (order.stockDeducted) {
            throw new Error(
              `${order.orderNumber} siparişinin stoğu daha önce düşülmüş.`
            );
          }

          const orderItem =
            order.items.find(
              (item) =>
                (
                  item.product.barcode
                    .trim()
                    .toUpperCase() ===
                    productBarcode ||
                  item.product.code
                    .trim()
                    .toUpperCase() ===
                    productBarcode
                ) &&
                item.pickedQuantity <
                  item.quantity
            );

          if (!orderItem) {
            throw new Error(
              `${productBarcode} barkodlu ürün siparişin kalan toplama kalemlerinde bulunmuyor.`
            );
          }

          if (
            !orderItem.product.isActive
          ) {
            throw new Error(
              `${orderItem.productCode} - ${orderItem.productName} ürünü pasif durumdadır.`
            );
          }

          const lineRemainingQuantity =
            orderItem.quantity -
            orderItem.pickedQuantity;

          if (
            quantity >
            lineRemainingQuantity
          ) {
            throw new Error(
              `Toplama miktarı sipariş kalanından fazla. ` +
                `Kalan: ${lineRemainingQuantity}, girilen: ${quantity}.`
            );
          }

          const [
            sourceUnit,
            targetUnit,
          ] = await Promise.all([
            tx.handlingUnit.findUnique({
              where: {
                barcode:
                  sourceBarcode,
              },

              select: {
                id: true,
                barcode: true,
                purpose: true,
                status: true,
                assignedOrderId: true,
                parentUnitId: true,
                warehouseId: true,
                locationId: true,

                warehouse: {
                  select: {
                    id: true,
                    code: true,
                    isActive: true,
                  },
                },

                location: {
                  select: {
                    id: true,
                    code: true,
                    section: true,
                    level: true,
                    bin: true,
                    isActive: true,
                  },
                },

                items: {
                  where: {
                    productId:
                      orderItem.productId,
                  },

                  select: {
                    id: true,
                    quantity: true,
                    reservedStock: true,
                  },
                },

                childUnits: {
                  select: {
                    id: true,
                  },
                },
              },
            }),

            tx.handlingUnit.findUnique({
              where: {
                barcode:
                  targetBarcode,
              },

              select: {
                id: true,
                barcode: true,
                purpose: true,
                status: true,
                assignedOrderId: true,
                parentUnitId: true,
                warehouseId: true,
                locationId: true,

                assignedOrder: {
                  select: {
                    id: true,
                    orderNumber: true,

                    customer: {
                      select: {
                        companyName: true,
                      },
                    },
                  },
                },

                items: {
                  select: {
                    id: true,
                    quantity: true,
                  },
                },
              },
            }),
          ]);

          if (!sourceUnit) {
            throw new Error(
              `${sourceBarcode} barkodlu kaynak THM bulunamadı.`
            );
          }

          if (!targetUnit) {
            throw new Error(
              `${targetBarcode} barkodlu hedef THM bulunamadı.`
            );
          }

          /*
           * KAYNAK THM GÜVENLİK KONTROLLERİ
           */

          if (
            sourceUnit.purpose !==
            HandlingUnitPurpose.STOCK
          ) {
            throw new Error(
              `${sourceUnit.barcode} normal stok THM'si değildir. ` +
                "Toplama kaynağı olarak kullanılamaz."
            );
          }

          if (
            sourceUnit.assignedOrderId !==
            null
          ) {
            throw new Error(
              `${sourceUnit.barcode} bir satış siparişine bağlıdır. ` +
                "Planlanabilir stok kaynağı olarak kullanılamaz."
            );
          }

          if (
            !canUseSourceStatus(
              sourceUnit.status
            )
          ) {
            throw new Error(
              `${sourceUnit.barcode} kaynak THM'sinin durumu toplamaya uygun değildir.`
            );
          }

          if (
            !sourceUnit.warehouseId ||
            !sourceUnit.locationId ||
            !sourceUnit.warehouse ||
            !sourceUnit.location
          ) {
            throw new Error(
              `${sourceUnit.barcode} adreslenmemiş stok içermektedir. ` +
                "Bu stok Bloke Stok durumundadır ve sipariş toplama kaynağı olarak kullanılamaz."
            );
          }

          if (
            !sourceUnit.warehouse.isActive
          ) {
            throw new Error(
              `${sourceUnit.barcode} pasif bir depoda bulunmaktadır.`
            );
          }

          if (
            !sourceUnit.location.isActive
          ) {
            throw new Error(
              `${sourceUnit.barcode} pasif bir lokasyonda bulunmaktadır.`
            );
          }

          const expectedLocationCode =
            createFullLocationCode({
              code:
                sourceUnit.location.code,

              section:
                sourceUnit.location.section,

              level:
                sourceUnit.location.level,

              bin:
                sourceUnit.location.bin,
            });

          if (
            expectedLocationCode !==
            locationBarcode
          ) {
            throw new Error(
              `Yanlış lokasyon okutuldu. ` +
                `Beklenen: ${expectedLocationCode}, ` +
                `okutulan: ${locationBarcode}.`
            );
          }

          /*
           * HEDEF THM GÜVENLİK KONTROLLERİ
           */

          if (
            targetUnit.purpose !==
            HandlingUnitPurpose.PICKING
          ) {
            throw new Error(
              `${targetUnit.barcode} normal stok veya farklı amaçlı bir THM'dir. ` +
                "Sipariş toplama hedefi olarak kullanılamaz."
            );
          }

          if (
            !canUseTargetStatus(
              targetUnit.status
            )
          ) {
            throw new Error(
              `${targetUnit.barcode} hedef toplama THM'si ürün kabul etmeye uygun değildir.`
            );
          }

          if (
            targetUnit.parentUnitId !==
            null
          ) {
            throw new Error(
              `${targetUnit.barcode} başka bir taşıma birimine bağlıdır. ` +
                "Bağımsız bir toplama THM'si kullanın."
            );
          }

          if (
            targetUnit.assignedOrderId !==
              null &&
            targetUnit.assignedOrderId !==
              order.id
          ) {
            throw new Error(
              `${targetUnit.barcode} toplama THM'si ` +
                `${targetUnit.assignedOrder?.orderNumber ?? "başka bir siparişe"} ` +
                `ve ${targetUnit.assignedOrder?.customer.companyName ?? "başka bir müşteriye"} aittir. ` +
                `${order.orderNumber} siparişi için kullanılamaz.`
            );
          }

          const targetCurrentQuantity =
            targetUnit.items.reduce(
              (total, item) =>
                total + item.quantity,
              0
            );

          if (
            targetUnit.assignedOrderId ===
              null &&
            targetCurrentQuantity > 0
          ) {
            throw new Error(
              `${targetUnit.barcode} henüz bir siparişe bağlı değildir fakat içinde stok bulunmaktadır. ` +
                "Güvenlik nedeniyle toplama hedefi olarak kullanılamaz."
            );
          }

          const sourceItem =
            sourceUnit.items[0];

          if (!sourceItem) {
            throw new Error(
              `${orderItem.productCode} - ${orderItem.productName} ürünü ` +
                `${sourceUnit.barcode} içinde bulunmuyor.`
            );
          }

          /*
           * Planlanabilir kaynakta rezerve miktar
           * olsa bile fiziksel miktar siparişe
           * ayrılmıştır. Toplama sırasında global
           * rezervasyon değişmez.
           *
           * Ancak THM özelinde başka kullanım için
           * ayrılmış miktar varsa kullanılabilir
           * miktardan düşülür.
           */
          const sourceAvailableQuantity =
            sourceItem.quantity -
            sourceItem.reservedStock;

          if (
            sourceAvailableQuantity <= 0
          ) {
            throw new Error(
              `${sourceUnit.barcode} içinde kullanılabilir ürün miktarı bulunmuyor.`
            );
          }

          if (
            quantity >
            sourceAvailableQuantity
          ) {
            throw new Error(
              `Kaynak THM'de yeterli kullanılabilir miktar yok. ` +
                `Fiziksel: ${sourceItem.quantity}, ` +
                `THM rezerve: ${sourceItem.reservedStock}, ` +
                `kullanılabilir: ${sourceAvailableQuantity}.`
            );
          }

          /*
           * İlk kullanımda hedef toplama THM'sini
           * mevcut siparişe kilitle.
           */
          if (
            targetUnit.assignedOrderId ===
            null
          ) {
            await tx.handlingUnit.update({
              where: {
                id: targetUnit.id,
              },

              data: {
                assignedOrderId:
                  order.id,
              },
            });
          }

          const sourceQuantityAfter =
            sourceItem.quantity -
            quantity;

          if (
            sourceQuantityAfter === 0 &&
            sourceItem.reservedStock === 0
          ) {
            await tx.handlingUnitItem.delete({
              where: {
                id: sourceItem.id,
              },
            });
          } else {
            await tx.handlingUnitItem.update({
              where: {
                id: sourceItem.id,
              },

              data: {
                quantity:
                  sourceQuantityAfter,
              },
            });
          }

          const targetProductItem =
            await tx.handlingUnitItem.upsert({
              where: {
                handling_unit_product_unique:
                  {
                    handlingUnitId:
                      targetUnit.id,

                    productId:
                      orderItem.productId,
                  },
              },

              update: {
                quantity: {
                  increment: quantity,
                },
              },

              create: {
                handlingUnitId:
                  targetUnit.id,

                productId:
                  orderItem.productId,

                quantity,
                reservedStock: 0,
              },

              select: {
                quantity: true,
              },
            });

          const updatedOrderItem =
            await tx.orderItem.update({
              where: {
                id: orderItem.id,
              },

              data: {
                pickedQuantity: {
                  increment: quantity,
                },
              },

              select: {
                id: true,
                quantity: true,
                pickedQuantity: true,
              },
            });

          const [
            sourceTotalResult,
            targetTotalResult,
            updatedOrderItems,
          ] = await Promise.all([
            tx.handlingUnitItem.aggregate({
              where: {
                handlingUnitId:
                  sourceUnit.id,
              },

              _sum: {
                quantity: true,
              },
            }),

            tx.handlingUnitItem.aggregate({
              where: {
                handlingUnitId:
                  targetUnit.id,
              },

              _sum: {
                quantity: true,
              },
            }),

            tx.orderItem.findMany({
              where: {
                orderId: order.id,
              },

              select: {
                quantity: true,
                pickedQuantity: true,
              },
            }),
          ]);

          const sourceTotalQuantity =
            sourceTotalResult._sum
              .quantity ?? 0;

          const targetTotalQuantity =
            targetTotalResult._sum
              .quantity ?? 0;

          if (
            sourceTotalQuantity === 0 &&
            sourceUnit.childUnits.length ===
              0
          ) {
            await tx.handlingUnit.update({
              where: {
                id: sourceUnit.id,
              },

              data: {
                status:
                  HandlingUnitStatus.EMPTY,
              },
            });
          }

          await tx.handlingUnit.update({
            where: {
              id: targetUnit.id,
            },

            data: {
              purpose:
                HandlingUnitPurpose.PICKING,

              assignedOrderId:
                order.id,

              status:
                targetUnit.warehouseId &&
                targetUnit.locationId
                  ? HandlingUnitStatus.STORED
                  : HandlingUnitStatus.OPEN,
            },
          });

          const orderTotalQuantity =
            updatedOrderItems.reduce(
              (total, item) =>
                total + item.quantity,
              0
            );

          const orderPickedQuantity =
            updatedOrderItems.reduce(
              (total, item) =>
                total +
                Math.min(
                  item.pickedQuantity,
                  item.quantity
                ),
              0
            );

          const orderRemainingQuantity =
            Math.max(
              0,
              orderTotalQuantity -
                orderPickedQuantity
            );

          const pickingCompleted =
            updatedOrderItems.every(
              (item) =>
                item.pickedQuantity >=
                item.quantity
            );

          const nextOrderStatus =
            pickingCompleted
              ? OrderStatus.PACKING
              : OrderStatus.PICKING;

          await tx.order.update({
            where: {
              id: order.id,
            },

            data: {
              status:
                nextOrderStatus,
            },
          });

          await tx.pickingRecord.create({
            data: {
              orderId: order.id,
              orderItemId:
                orderItem.id,

              productId:
                orderItem.productId,

              sourceHandlingUnitId:
                sourceUnit.id,

              targetHandlingUnitId:
                targetUnit.id,

              quantity,

              sourceQuantityAfter,

              targetQuantityAfter:
                targetProductItem.quantity,
            },
          });

          const progressPercentage =
            orderTotalQuantity > 0
              ? Math.min(
                  100,
                  Math.round(
                    (
                      orderPickedQuantity /
                      orderTotalQuantity
                    ) * 100
                  )
                )
              : 0;

          return {
            orderId: order.id,
            orderNumber:
              order.orderNumber,

            orderStatus:
              nextOrderStatus,

            orderItemId:
              orderItem.id,

            productId:
              orderItem.productId,

            productCode:
              orderItem.productCode,

            productBarcode:
              orderItem.product.barcode,

            productName:
              orderItem.productName,

            sourceUnitId:
              sourceUnit.id,

            sourceBarcode:
              sourceUnit.barcode,

            sourceQuantityAfter,

            targetUnitId:
              targetUnit.id,

            targetBarcode:
              targetUnit.barcode,

            targetQuantityAfter:
              targetTotalQuantity,

            pickedQuantity:
              quantity,

            linePickedQuantity:
              updatedOrderItem
                .pickedQuantity,

            lineRemainingQuantity:
              Math.max(
                0,
                updatedOrderItem.quantity -
                  updatedOrderItem
                    .pickedQuantity
              ),

            orderPickedQuantity,
            orderTotalQuantity,
            orderRemainingQuantity,
            progressPercentage,
            pickingCompleted,
          };
        },
        {
          maxWait: 10000,
          timeout: 30000,

          isolationLevel:
            Prisma
              .TransactionIsolationLevel
              .Serializable,
        }
      );

    revalidatePath("/rf");
    revalidatePath("/rf/picking");

    revalidatePath(
      "/admin/orders"
    );

    revalidatePath(
      `/admin/orders/${result.orderId}`
    );

    revalidatePath(
      "/admin/handling-units"
    );

    revalidatePath(
      `/admin/handling-units/${result.sourceUnitId}`
    );

    revalidatePath(
      `/admin/handling-units/${result.targetUnitId}`
    );

    revalidatePath(
      "/admin/stock/locations"
    );

    return {
      success: true,

      message:
        `${result.productCode} - ${result.productName} ürününden ` +
        `${result.pickedQuantity} adet toplandı. ` +
        `${result.targetBarcode} toplama THM'si ` +
        `${result.orderNumber} siparişine bağlıdır.`,

      orderId: result.orderId,
      orderNumber:
        result.orderNumber,

      orderStatus:
        getOrderStatusLabel(
          result.orderStatus
        ),

      orderItemId:
        result.orderItemId,

      productId:
        result.productId,

      productCode:
        result.productCode,

      productBarcode:
        result.productBarcode,

      productName:
        result.productName,

      sourceUnitId:
        result.sourceUnitId,

      sourceBarcode:
        result.sourceBarcode,

      sourceQuantityAfter:
        result.sourceQuantityAfter,

      targetUnitId:
        result.targetUnitId,

      targetBarcode:
        result.targetBarcode,

      targetQuantityAfter:
        result.targetQuantityAfter,

      pickedQuantity:
        result.pickedQuantity,

      linePickedQuantity:
        result.linePickedQuantity,

      lineRemainingQuantity:
        result.lineRemainingQuantity,

      orderPickedQuantity:
        result.orderPickedQuantity,

      orderTotalQuantity:
        result.orderTotalQuantity,

      orderRemainingQuantity:
        result.orderRemainingQuantity,

      progressPercentage:
        result.progressPercentage,

      pickingCompleted:
        result.pickingCompleted,
    };
  } catch (error) {
    console.error(
      "RF sipariş toplama hatası:",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return createErrorState(
        "Aynı stok üzerinde başka bir işlem yapıldı. Lütfen tekrar deneyin."
      );
    }

    return createErrorState(
      error instanceof Error
        ? error.message
        : "Sipariş toplama sırasında beklenmeyen bir hata oluştu."
    );
  }
}
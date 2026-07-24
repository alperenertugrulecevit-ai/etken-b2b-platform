import "dotenv/config";

import {
  InventoryCountStatus,
  Prisma,
  PrismaClient,
  StockMovementType,
} from "@prisma/client";

const prisma =
  new PrismaClient();

type ProductRepairPlan = {
  productId: number;
  productCode: string;
  productName: string;

  desiredMovement:
    number;

  existingMovement:
    number;

  correction:
    number;

  currentStock:
    number;

  correctedStock:
    number;

  reservedStock:
    number;

  movementIds:
    number[];

  movementCreatedAt:
    Date | null;
};

function readArgument(
  argumentName: string
) {
  const prefix =
    `--${argumentName}=`;

  const argument =
    process.argv.find(
      (value) =>
        value.startsWith(
          prefix
        )
    );

  return argument
    ? argument
        .slice(
          prefix.length
        )
        .trim()
    : "";
}

function formatSignedNumber(
  value: number
) {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

async function createRepairPlan(
  countNumber: string
) {
  const inventoryCount =
    await prisma.inventoryCount.findUnique({
      where: {
        countNumber,
      },

      select: {
        id: true,
        countNumber: true,
        status: true,
        approvedAt: true,

        lines: {
          select: {
            id: true,
            productId: true,
            productCode: true,
            productName: true,

            systemQuantity:
              true,

            countedQuantity:
              true,

            difference: true,

            appliedQuantityChange:
              true,
          },
        },
      },
    });

  if (!inventoryCount) {
    throw new Error(
      `${countNumber} numaralı sayım bulunamadı.`
    );
  }

  if (
    inventoryCount.status !==
    InventoryCountStatus.APPROVED
  ) {
    throw new Error(
      "Yalnızca onaylanmış sayımların stok hareketleri onarılabilir."
    );
  }

  const desiredMovementByProduct =
    new Map<
      number,
      {
        productCode: string;
        productName: string;
        totalDifference: number;
      }
    >();

  for (
    const line of
    inventoryCount.lines
  ) {
    const lineDifference =
      line.appliedQuantityChange ??
      line.difference ??
      (
        (
          line.countedQuantity ??
          0
        ) -
        line.systemQuantity
      );

    const existingGroup =
      desiredMovementByProduct.get(
        line.productId
      );

    if (existingGroup) {
      existingGroup.totalDifference +=
        lineDifference;
    } else {
      desiredMovementByProduct.set(
        line.productId,
        {
          productCode:
            line.productCode,

          productName:
            line.productName,

          totalDifference:
            lineDifference,
        }
      );
    }
  }

  const existingMovements =
    await prisma.stockMovement.findMany({
      where: {
        documentNumber:
          countNumber,

        movementType: {
          in: [
            StockMovementType.COUNT_INCREASE,
            StockMovementType.COUNT_DECREASE,
          ],
        },
      },

      orderBy: {
        createdAt: "asc",
      },

      select: {
        id: true,
        productId: true,
        physicalChange: true,
        createdAt: true,

        product: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });

  if (
    existingMovements.length ===
    0
  ) {
    throw new Error(
      `${countNumber} sayım numarasına ait stok hareketi bulunamadı.`
    );
  }

  const productIds =
    Array.from(
      new Set([
        ...Array.from(
          desiredMovementByProduct.keys()
        ),

        ...existingMovements.map(
          (movement) =>
            movement.productId
        ),
      ])
    );

  const products =
    await prisma.product.findMany({
      where: {
        id: {
          in:
            productIds,
        },
      },

      select: {
        id: true,
        code: true,
        name: true,
        stock: true,
        reservedStock: true,
      },
    });

  const productMap =
    new Map(
      products.map(
        (product) => [
          product.id,
          product,
        ]
      )
    );

  const plans:
    ProductRepairPlan[] = [];

  for (
    const productId of
    productIds
  ) {
    const product =
      productMap.get(
        productId
      );

    if (!product) {
      throw new Error(
        `${productId} kimlikli ürün bulunamadı.`
      );
    }

    const productMovements =
      existingMovements.filter(
        (movement) =>
          movement.productId ===
          productId
      );

    const existingMovement =
      productMovements.reduce(
        (
          total,
          movement
        ) =>
          total +
          movement.physicalChange,
        0
      );

    const desiredGroup =
      desiredMovementByProduct.get(
        productId
      );

    const desiredMovement =
      desiredGroup
        ?.totalDifference ??
      0;

    const correction =
      desiredMovement -
      existingMovement;

    const correctedStock =
      product.stock +
      correction;

    if (
      correctedStock < 0
    ) {
      throw new Error(
        `${product.code} ürünü onarım sonrasında negatif stoğa düşüyor. ` +
          `Mevcut: ${product.stock}, düzeltme: ${correction}.`
      );
    }

    if (
      correctedStock <
      product.reservedStock
    ) {
      throw new Error(
        `${product.code} ürünü onarım sonrasında rezerve stoktan düşük kalıyor. ` +
          `Yeni stok: ${correctedStock}, rezerve: ${product.reservedStock}.`
      );
    }

    const movementCreatedAt =
      productMovements.length > 0
        ? productMovements[
            productMovements.length -
              1
          ].createdAt
        : inventoryCount.approvedAt;

    plans.push({
      productId,

      productCode:
        desiredGroup
          ?.productCode ??
        product.code,

      productName:
        desiredGroup
          ?.productName ??
        product.name,

      desiredMovement,
      existingMovement,
      correction,

      currentStock:
        product.stock,

      correctedStock,

      reservedStock:
        product.reservedStock,

      movementIds:
        productMovements.map(
          (movement) =>
            movement.id
        ),

      movementCreatedAt,
    });
  }

  /*
   * Hatalı sayım hareketlerinden sonra
   * aynı ürünlerde başka hareket
   * oluşmuşsa otomatik onarım yapılmaz.
   *
   * Böylece sonraki hareketlerin bakiye
   * zinciri bozulmaz.
   */
  for (
    const plan of
    plans
  ) {
    if (
      !plan.movementCreatedAt
    ) {
      continue;
    }

    const laterMovement =
      await prisma.stockMovement.findFirst({
        where: {
          productId:
            plan.productId,

          documentNumber: {
            not:
              countNumber,
          },

          createdAt: {
            gt:
              plan.movementCreatedAt,
          },
        },

        orderBy: {
          createdAt: "asc",
        },

        select: {
          id: true,
          documentNumber: true,
          createdAt: true,
        },
      });

    if (laterMovement) {
      throw new Error(
        `${plan.productCode} ürünü için hatalı sayımdan sonra başka stok hareketi oluşmuş. ` +
          `Hareket ID: ${laterMovement.id}, belge: ${laterMovement.documentNumber ?? "-"}. ` +
          "Otomatik onarım güvenlik nedeniyle durduruldu."
      );
    }
  }

  return {
    inventoryCount,
    plans,
  };
}

async function applyRepair(
  countNumber: string,
  plans: ProductRepairPlan[],
  approvedAt: Date | null
) {
  await prisma.$transaction(
    async (transaction) => {
      /*
       * Plan hazırlanırken okunan ürün
       * bakiyelerinin değişmediği tekrar
       * kontrol edilir.
       */
      for (
        const plan of
        plans
      ) {
        const currentProduct =
          await transaction.product.findUnique({
            where: {
              id:
                plan.productId,
            },

            select: {
              stock: true,
              reservedStock:
                true,
            },
          });

        if (!currentProduct) {
          throw new Error(
            `${plan.productCode} ürünü bulunamadı.`
          );
        }

        if (
          currentProduct.stock !==
            plan.currentStock ||
          currentProduct.reservedStock !==
            plan.reservedStock
        ) {
          throw new Error(
            `${plan.productCode} ürününün stok bakiyesi ön izlemeden sonra değişmiş. ` +
              "Onarım iptal edildi; ön izlemeyi yeniden çalıştırın."
          );
        }
      }

      const movementIds =
        plans.flatMap(
          (plan) =>
            plan.movementIds
        );

      if (
        movementIds.length > 0
      ) {
        await transaction.stockMovement.deleteMany({
          where: {
            id: {
              in:
                movementIds,
            },

            documentNumber:
              countNumber,

            movementType: {
              in: [
                StockMovementType.COUNT_INCREASE,
                StockMovementType.COUNT_DECREASE,
              ],
            },
          },
        });
      }

      for (
        const plan of
        plans
      ) {
        if (
          plan.correction !== 0
        ) {
          await transaction.product.update({
            where: {
              id:
                plan.productId,
            },

            data: {
              stock:
                plan.correctedStock,
            },
          });
        }

        /*
         * Doğru toplam fark sıfırsa
         * hareket oluşturulmaz.
         */
        if (
          plan.desiredMovement ===
          0
        ) {
          continue;
        }

        await transaction.stockMovement.create({
          data: {
            productId:
              plan.productId,

            movementType:
              plan.desiredMovement >
              0
                ? StockMovementType.COUNT_INCREASE
                : StockMovementType.COUNT_DECREASE,

            physicalChange:
              plan.desiredMovement,

            reservedChange: 0,

            physicalBalanceAfter:
              plan.correctedStock,

            reservedBalanceAfter:
              plan.reservedStock,

            availableBalanceAfter:
              plan.correctedStock -
              plan.reservedStock,

            documentNumber:
              countNumber,

            description:
              `${countNumber} numaralı planlı sayım sonucu düzeltildi: ` +
              `${plan.productCode} - ${plan.productName}, ` +
              (
                plan.desiredMovement >
                0
                  ? `sayım fazlası +${plan.desiredMovement}.`
                  : `sayım eksiği ${plan.desiredMovement}.`
              ),

            createdAt:
              approvedAt ??
              new Date(),
          },
        });
      }
    },
    {
      maxWait: 10000,
      timeout: 120000,

      isolationLevel:
        Prisma
          .TransactionIsolationLevel
          .Serializable,
    }
  );
}

async function main() {
  const countNumber =
    readArgument(
      "count"
    ).toUpperCase();

  const shouldApply =
    process.argv.includes(
      "--apply"
    );

  if (!countNumber) {
    throw new Error(
      "Sayım numarası eksik. Örnek: --count=SAY-20260723-0001"
    );
  }

  console.log(
    "--------------------------------"
  );

  console.log(
    "Planlı sayım hareket onarımı"
  );

  console.log(
    `Sayım numarası: ${countNumber}`
  );

  console.log(
    `Çalışma modu: ${
      shouldApply
        ? "UYGULA"
        : "SADECE ÖN İZLEME"
    }`
  );

  console.log(
    "--------------------------------"
  );

  const {
    inventoryCount,
    plans,
  } =
    await createRepairPlan(
      countNumber
    );

  console.table(
    plans.map(
      (plan) => ({
        ürün:
          plan.productCode,

        mevcutHareket:
          formatSignedNumber(
            plan.existingMovement
          ),

        olmasıGereken:
          formatSignedNumber(
            plan.desiredMovement
          ),

        stokDüzeltmesi:
          formatSignedNumber(
            plan.correction
          ),

        mevcutStok:
          plan.currentStock,

        düzeltilmişStok:
          plan.correctedStock,

        silinecekHareket:
          plan.movementIds.length,
      })
    )
  );

  if (!shouldApply) {
    console.log("");
    console.log(
      "ÖN İZLEME TAMAMLANDI."
    );

    console.log(
      "Henüz veritabanında değişiklik yapılmadı."
    );

    console.log("");
    console.log(
      "Tablo doğruysa aynı komutu --apply ekleyerek çalıştırın."
    );

    return;
  }

  await applyRepair(
    countNumber,
    plans,
    inventoryCount.approvedAt
  );

  console.log("");
  console.log(
    "✓ Hatalı sayım hareketleri silindi."
  );

  console.log(
    "✓ Global ürün stokları düzeltildi."
  );

  console.log(
    "✓ Yalnızca gerçek net farklar için doğru sayım hareketleri oluşturuldu."
  );
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      "Onarım başarısız:"
    );

    console.error(
      error instanceof Error
        ? error.message
        : error
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
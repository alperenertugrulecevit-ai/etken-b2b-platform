import { Prisma, PrismaClient, WaveStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  calculateStableTargetPriorities,
  isValidThmBarcode,
  normalizeThmBarcode,
} from "@/modules/manual-wave/domain/manual-sorting";

export type ManualWaveScope = {
  tenantId: string;
  companyId: string;
  warehouseId: number;
};
type Db = Prisma.TransactionClient | PrismaClient;

export class ManualSortingError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

const scoped = (scope: ManualWaveScope) => ({
  tenantId: scope.tenantId,
  companyId: scope.companyId,
  warehouseId: scope.warehouseId,
});

async function lockWave(
  tx: Prisma.TransactionClient,
  waveId: string
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${waveId}))`;
}

/**
 * Wave predates explicit WMS scope columns. Scope is therefore proven through
 * existing operational relations: all planned products belong to the company,
 * and a Wave-assigned/picking HandlingUnit belongs to the selected warehouse.
 * Projection rows are deliberately not accepted as scope evidence.
 */
async function requireWaveInScope(
  db: Db,
  waveId: string,
  scope: ManualWaveScope
) {
  const warehouse = await db.warehouse.findFirst({
    where: {
      id: scope.warehouseId,
      tenantId: scope.tenantId,
      companyId: scope.companyId,
    },
    select: { id: true },
  });
  if (!warehouse) {
    throw new ManualSortingError(
      "SCOPE_MISMATCH",
      "Wave çalışma alanı geçersiz."
    );
  }

  const wave = await db.wave.findFirst({
    where: {
      id: waveId,
      distributions: {
        some: {
          lines: {
            some: {
              product: {
                tenantId: scope.tenantId,
                companyId: scope.companyId,
              },
            },
            every: {
              product: {
                tenantId: scope.tenantId,
                companyId: scope.companyId,
              },
            },
          },
        },
      },
      OR: [
        {
          handlingUnits: {
            some: {
              tenantId: scope.tenantId,
              companyId: scope.companyId,
              warehouseId: scope.warehouseId,
            },
          },
        },
        {
          pickingRecords: {
            some: {
              OR: [
                {
                  sourceHandlingUnit: {
                    tenantId: scope.tenantId,
                    companyId: scope.companyId,
                    warehouseId: scope.warehouseId,
                  },
                },
                {
                  targetHandlingUnit: {
                    tenantId: scope.tenantId,
                    companyId: scope.companyId,
                    warehouseId: scope.warehouseId,
                  },
                },
              ],
            },
          },
        },
      ],
    },
    select: { id: true, status: true },
  });

  if (!wave) {
    throw new ManualSortingError(
      "WAVE_SCOPE_MISMATCH",
      "Wave aktif şirket ve depo çalışma alanına ait değil."
    );
  }
  return wave;
}

async function refreshWaveLifecycle(
  tx: Prisma.TransactionClient,
  waveId: string,
  scope: ManualWaveScope
) {
  const totals = await tx.manualSortingLine.aggregate({
    where: { ...scoped(scope), waveId },
    _sum: {
      plannedQuantity: true,
      distributedQuantity: true,
    },
  });
  const planned = totals._sum.plannedQuantity ?? 0;
  const distributed = totals._sum.distributedQuantity ?? 0;
  const complete = planned > 0 && planned === distributed;
  const consolidationProgress = planned
    ? Math.floor((distributed * 100) / planned)
    : 0;
  const current = await tx.wave.findUniqueOrThrow({
    where: { id: waveId },
    select: { status: true },
  });

  await tx.wave.update({
    where: { id: waveId },
    data: {
      consolidationProgress,
      status: complete
        ? WaveStatus.COMPLETED
        : current.status === WaveStatus.COMPLETED ||
            current.status === WaveStatus.READY ||
            current.status === WaveStatus.RELEASED
          ? WaveStatus.IN_PROGRESS
          : current.status,
      completedAt: complete ? new Date() : null,
      startedAt:
        !complete &&
        (current.status === WaveStatus.READY ||
          current.status === WaveStatus.RELEASED)
          ? new Date()
          : undefined,
    },
  });

  return {
    planned,
    distributed,
    remaining: planned - distributed,
    complete,
  };
}

export class ManualSortingService {
  static async initializeWave(
    waveId: string,
    scope: ManualWaveScope,
    db: Db = prisma
  ) {
    await requireWaveInScope(db, waveId, scope);
    const wave = await db.wave.findUniqueOrThrow({
      where: { id: waveId },
      include: {
        distributions: { include: { lines: true } },
      },
    });
    const priorities = calculateStableTargetPriorities(
      wave.distributions.map((distribution) => ({
        distributionId: distribution.id,
        targetCode:
          distribution.customerCode ||
          distribution.distributionCode,
        plannedQuantity: distribution.plannedQuantity,
      }))
    );
    await Promise.all(
      priorities.map((priority) =>
        db.manualSortingTargetPriority.upsert({
          where: {
            waveId_distributionId: {
              waveId,
              distributionId: priority.distributionId,
            },
          },
          create: { ...scoped(scope), waveId, ...priority },
          update: {},
        })
      )
    );
    const grouped = new Map<
      string,
      {
        productId: number;
        distributionId: string;
        plannedQuantity: number;
      }
    >();
    for (const distribution of wave.distributions) {
      for (const line of distribution.lines) {
        const key = `${line.productId}:${distribution.id}`;
        const previous = grouped.get(key);
        grouped.set(key, {
          productId: line.productId,
          distributionId: distribution.id,
          plannedQuantity:
            (previous?.plannedQuantity ?? 0) +
            line.plannedQuantity,
        });
      }
    }
    await Promise.all(
      [...grouped.values()].map((line) =>
        db.manualSortingLine.upsert({
          where: {
            waveId_productId_distributionId: {
              waveId,
              productId: line.productId,
              distributionId: line.distributionId,
            },
          },
          create: { ...scoped(scope), waveId, ...line },
          update: {},
        })
      )
    );
  }

  static async getManualSortingWave(
    waveId: string,
    scope: ManualWaveScope
  ) {
    await this.initializeWave(waveId, scope);
    return prisma.wave.findFirst({
      where: {
        id: waveId,
        sortingLines: { some: scoped(scope) },
      },
      include: {
        pickingBarcodes: {
          where: { ...scoped(scope), isActive: true },
        },
        sortingPriorities: {
          where: scoped(scope),
          orderBy: { priorityRank: "asc" },
        },
        sortingLines: {
          where: scoped(scope),
          include: { product: true, distribution: true },
        },
      },
    });
  }

  static async validatePickingBarcode(
    waveId: string,
    barcode: string,
    scope: ManualWaveScope,
    db: Db = prisma
  ) {
    await requireWaveInScope(db, waveId, scope);
    const record = await db.wavePickingBarcode.findFirst({
      where: {
        ...scoped(scope),
        waveId,
        barcode: barcode.trim(),
        isActive: true,
      },
    });
    if (!record) {
      throw new ManualSortingError(
        "INVALID_PICKING_BARCODE",
        "Toplama barkodu bu Wave için geçerli değil."
      );
    }
    return record;
  }

  static async resolveSortingTarget(
    waveId: string,
    productBarcode: string,
    scope: ManualWaveScope,
    db: Db = prisma
  ) {
    await this.initializeWave(waveId, scope, db);
    const normalizedBarcode = productBarcode.trim();
    const product = await db.product.findFirst({
      where: {
        tenantId: scope.tenantId,
        companyId: scope.companyId,
        isActive: true,
        OR: [
          { barcode: normalizedBarcode },
          { code: normalizedBarcode },
          { productBarcodes: { some: { barcode: normalizedBarcode } } },
        ],
      },
    });
    if (!product) {
      throw new ManualSortingError(
        "PRODUCT_NOT_FOUND",
        "Ürün barkodu bulunamadı."
      );
    }
    const candidates = await db.manualSortingLine.findMany({
      where: { ...scoped(scope), waveId, productId: product.id },
      include: { distribution: true },
    });
    const remaining = candidates.filter(
      (line) => line.distributedQuantity < line.plannedQuantity
    );
    const priorities =
      await db.manualSortingTargetPriority.findMany({
        where: { ...scoped(scope), waveId },
        orderBy: { priorityRank: "asc" },
      });
    const selected = priorities
      .map((priority) => ({
        priority,
        line: remaining.find(
          (line) => line.distributionId === priority.distributionId
        ),
      }))
      .find((candidate) => candidate.line);
    if (!selected?.line) {
      throw new ManualSortingError(
        "NO_REMAINING_DEMAND",
        "Ürün için kalan Wave talebi yok."
      );
    }
    return {
      product,
      sortingLine: selected.line,
      distribution: selected.line.distribution,
      priorityRank: selected.priority.priorityRank,
      remainingQuantity:
        selected.line.plannedQuantity -
        selected.line.distributedQuantity,
    };
  }

  static async commitSortingScan(
    input: {
      waveId: string;
      pickingBarcode: string;
      productBarcode: string;
      expectedDistributionId: string;
      thmBarcode: string;
      quantity?: number;
      operatorId: string;
      terminalId?: string;
      idempotencyKey: string;
    },
    scope: ManualWaveScope
  ) {
    const thmBarcode = normalizeThmBarcode(input.thmBarcode);
    if (!isValidThmBarcode(thmBarcode)) {
      throw new ManualSortingError(
        "INVALID_THM_BARCODE",
        "THM barkodu büyük harf ST- ile başlamalıdır."
      );
    }
    return prisma.$transaction(
      async (tx) => {
        await lockWave(tx, input.waveId);
        await requireWaveInScope(tx, input.waveId, scope);
        const existing =
          await tx.manualSortingTransaction.findUnique({
            where: {
              tenantId_companyId_warehouseId_idempotencyKey: {
                ...scoped(scope),
                idempotencyKey: input.idempotencyKey,
              },
            },
          });
        if (existing) return existing;
        const picking = await this.validatePickingBarcode(
          input.waveId,
          input.pickingBarcode,
          scope,
          tx
        );
        const target = await this.resolveSortingTarget(
          input.waveId,
          input.productBarcode,
          scope,
          tx
        );
        if (target.distribution.id !== input.expectedDistributionId) {
          throw new ManualSortingError(
            "TARGET_CHANGED",
            "Hedef eşzamanlı işlem nedeniyle değişti; ürünü yeniden okutun."
          );
        }
        const quantity = input.quantity ?? 1;
        if (
          !Number.isInteger(quantity) ||
          quantity <= 0 ||
          quantity > target.remainingQuantity
        ) {
          throw new ManualSortingError(
            "QUANTITY_OVERRUN",
            "Miktar kalan talebi aşamaz."
          );
        }
        const thm = await tx.handlingUnit.findFirst({
          where: {
            barcode: thmBarcode,
            tenantId: scope.tenantId,
            companyId: scope.companyId,
            warehouseId: scope.warehouseId,
          },
        });
        if (!thm) {
          throw new ManualSortingError(
            "THM_NOT_FOUND",
            "THM bulunamadı."
          );
        }
        const binding =
          await tx.manualSortingThmBinding.findUnique({
            where: {
              waveId_handlingUnitId: {
                waveId: input.waveId,
                handlingUnitId: thm.id,
              },
            },
          });
        if (
          binding &&
          binding.distributionId !== target.distribution.id
        ) {
          throw new ManualSortingError(
            "THM_WRONG_TARGET",
            "THM başka bir hedefe bağlı."
          );
        }
        await tx.manualSortingLine.update({
          where: { id: target.sortingLine.id },
          data: { distributedQuantity: { increment: quantity } },
        });
        await tx.manualSortingThmBinding.upsert({
          where: {
            waveId_handlingUnitId: {
              waveId: input.waveId,
              handlingUnitId: thm.id,
            },
          },
          create: {
            ...scoped(scope),
            waveId: input.waveId,
            handlingUnitId: thm.id,
            distributionId: target.distribution.id,
            activeQuantity: quantity,
          },
          update: { activeQuantity: { increment: quantity } },
        });
        const transaction =
          await tx.manualSortingTransaction.create({
            data: {
              ...scoped(scope),
              waveId: input.waveId,
              pickingBarcodeId: picking.id,
              sortingLineId: target.sortingLine.id,
              productId: target.product.id,
              distributionId: target.distribution.id,
              handlingUnitId: thm.id,
              originalHandlingUnitId: thm.id,
              quantity,
              operatorId: input.operatorId,
              terminalId: input.terminalId?.trim() || undefined,
              idempotencyKey: input.idempotencyKey,
            },
          });
        await refreshWaveLifecycle(tx, input.waveId, scope);
        // Sorting lines are Wave/product/target scoped, not picking-barcode
        // scoped. Deactivating one of multiple barcodes would therefore be
        // unprovable. A future planning relation can safely enable this.
        return transaction;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  static async getPickingProgress(
    waveId: string,
    scope: ManualWaveScope
  ) {
    await requireWaveInScope(prisma, waveId, scope);
    const totals = await prisma.manualSortingLine.aggregate({
      where: { ...scoped(scope), waveId },
      _sum: {
        plannedQuantity: true,
        distributedQuantity: true,
      },
    });
    const planned = totals._sum.plannedQuantity ?? 0;
    const distributed = totals._sum.distributedQuantity ?? 0;
    return {
      planned,
      distributed,
      remaining: planned - distributed,
      complete: planned > 0 && planned === distributed,
      pickingBarcodeComplete: false,
    };
  }

  static async undoSortingTransaction(
    input: {
      transactionId: string;
      actorId: string;
      reason: string;
      idempotencyKey: string;
    },
    scope: ManualWaveScope
  ) {
    return prisma.$transaction(
      async (tx) => {
        const original =
          await tx.manualSortingTransaction.findFirst({
            where: { id: input.transactionId, ...scoped(scope) },
          });
        if (!original) {
          throw new ManualSortingError(
            "TRANSACTION_NOT_FOUND",
            "Ayrıştırma işlemi bulunamadı."
          );
        }
        await lockWave(tx, original.waveId);
        await requireWaveInScope(tx, original.waveId, scope);
        const prior = await tx.thmOperation.findUnique({
          where: {
            tenantId_companyId_warehouseId_idempotencyKey: {
              ...scoped(scope),
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (prior) return prior;
        const transaction =
          await tx.manualSortingTransaction.findFirst({
            where: { id: original.id, ...scoped(scope) },
          });
        if (!transaction || transaction.status === "REVERSED") {
          throw new ManualSortingError(
            "ALREADY_REVERSED",
            "İşlem daha önce geri alınmış."
          );
        }
        const line = await tx.manualSortingLine.findFirst({
          where: {
            id: transaction.sortingLineId,
            ...scoped(scope),
          },
        });
        // handlingUnitId is intentionally the current owner and is moved on
        // every merge; originalHandlingUnitId remains immutable provenance.
        const binding =
          await tx.manualSortingThmBinding.findFirst({
            where: {
              waveId: transaction.waveId,
              handlingUnitId: transaction.handlingUnitId,
              ...scoped(scope),
            },
          });
        if (
          !line ||
          !binding ||
          line.distributedQuantity < transaction.quantity ||
          binding.activeQuantity < transaction.quantity
        ) {
          throw new ManualSortingError(
            "NEGATIVE_QUANTITY",
            "Aktif miktar negatif olamaz."
          );
        }
        await tx.manualSortingTransaction.update({
          where: { id: transaction.id },
          data: {
            status: "REVERSED",
            reversedAt: new Date(),
            reversedById: input.actorId,
            reversalReason: input.reason.trim(),
          },
        });
        await tx.manualSortingLine.update({
          where: { id: line.id },
          data: {
            distributedQuantity: { decrement: transaction.quantity },
          },
        });
        const remaining =
          binding.activeQuantity - transaction.quantity;
        if (remaining === 0) {
          await tx.manualSortingThmBinding.delete({
            where: { id: binding.id },
          });
        } else {
          await tx.manualSortingThmBinding.update({
            where: { id: binding.id },
            data: { activeQuantity: remaining },
          });
        }
        await refreshWaveLifecycle(tx, transaction.waveId, scope);
        return tx.thmOperation.create({
          data: {
            ...scoped(scope),
            waveId: transaction.waveId,
            type: "UNDO_DISTRIBUTION",
            sourceHandlingUnitId: transaction.handlingUnitId,
            transactionId: transaction.id,
            actorId: input.actorId,
            reason: input.reason.trim(),
            idempotencyKey: input.idempotencyKey,
            metadata: {
              quantity: transaction.quantity,
              originalHandlingUnitId:
                transaction.originalHandlingUnitId,
              currentHandlingUnitId: transaction.handlingUnitId,
            },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  static async mergeThm(
    input: {
      waveId: string;
      sourceBarcode: string;
      targetBarcode: string;
      actorId: string;
      reason?: string;
      idempotencyKey: string;
    },
    scope: ManualWaveScope
  ) {
    const sourceBarcode = normalizeThmBarcode(input.sourceBarcode);
    const targetBarcode = normalizeThmBarcode(input.targetBarcode);
    if (sourceBarcode === targetBarcode) {
      throw new ManualSortingError(
        "SAME_THM",
        "Kaynak ve hedef THM farklı olmalıdır."
      );
    }
    if (
      !isValidThmBarcode(sourceBarcode) ||
      !isValidThmBarcode(targetBarcode)
    ) {
      throw new ManualSortingError(
        "INVALID_THM_BARCODE",
        "THM barkodu büyük harf ST- ile başlamalıdır."
      );
    }
    return prisma.$transaction(
      async (tx) => {
        await lockWave(tx, input.waveId);
        await requireWaveInScope(tx, input.waveId, scope);
        const prior = await tx.thmOperation.findUnique({
          where: {
            tenantId_companyId_warehouseId_idempotencyKey: {
              ...scoped(scope),
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (prior) return prior;
        const units = await tx.handlingUnit.findMany({
          where: {
            barcode: { in: [sourceBarcode, targetBarcode] },
            tenantId: scope.tenantId,
            companyId: scope.companyId,
            warehouseId: scope.warehouseId,
          },
        });
        const source = units.find(
          (unit) => unit.barcode === sourceBarcode
        );
        const target = units.find(
          (unit) => unit.barcode === targetBarcode
        );
        if (!source || !target) {
          throw new ManualSortingError(
            "THM_NOT_FOUND",
            "Kaynak veya hedef THM bulunamadı."
          );
        }
        const sourceBinding =
          await tx.manualSortingThmBinding.findFirst({
            where: {
              ...scoped(scope),
              waveId: input.waveId,
              handlingUnitId: source.id,
            },
          });
        if (!sourceBinding || sourceBinding.activeQuantity <= 0) {
          throw new ManualSortingError(
            "SOURCE_UNUSED",
            "Kaynak THM bu Wave içinde aktif değil."
          );
        }
        const targetBinding =
          await tx.manualSortingThmBinding.findFirst({
            where: {
              ...scoped(scope),
              waveId: input.waveId,
              handlingUnitId: target.id,
            },
          });
        if (
          targetBinding &&
          targetBinding.distributionId !== sourceBinding.distributionId
        ) {
          throw new ManualSortingError(
            "THM_WRONG_TARGET",
            "Hedef THM başka mağazaya bağlı."
          );
        }
        await tx.manualSortingThmBinding.upsert({
          where: {
            waveId_handlingUnitId: {
              waveId: input.waveId,
              handlingUnitId: target.id,
            },
          },
          create: {
            ...scoped(scope),
            waveId: input.waveId,
            handlingUnitId: target.id,
            distributionId: sourceBinding.distributionId,
            activeQuantity: sourceBinding.activeQuantity,
          },
          update: {
            activeQuantity: { increment: sourceBinding.activeQuantity },
          },
        });
        await tx.manualSortingTransaction.updateMany({
          where: {
            ...scoped(scope),
            waveId: input.waveId,
            handlingUnitId: source.id,
            status: "ACTIVE",
          },
          data: { handlingUnitId: target.id },
        });
        await tx.manualSortingThmBinding.delete({
          where: { id: sourceBinding.id },
        });
        return tx.thmOperation.create({
          data: {
            ...scoped(scope),
            waveId: input.waveId,
            type: "MERGE",
            sourceHandlingUnitId: source.id,
            targetHandlingUnitId: target.id,
            actorId: input.actorId,
            reason: input.reason?.trim(),
            idempotencyKey: input.idempotencyKey,
            metadata: { movedQuantity: sourceBinding.activeQuantity },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }
}

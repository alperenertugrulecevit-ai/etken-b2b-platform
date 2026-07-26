import {
  HandlingUnitPurpose,
  HandlingUnitStatus,
  WaveDistributionStatus,
  WaveStatus,
} from "@prisma/client";

import Link from "next/link";

import RFWavePoolPickingForm, {
  type WavePoolOption,
  type WavePoolSourceOption,
  type WavePoolTargetOption,
} from "@/components/rf/RFWavePoolPickingForm";

import { prisma } from "@/lib/prisma";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

function getWaveStatusLabel(
  status: WaveStatus
) {
  const labels: Record<
    WaveStatus,
    string
  > = {
    DRAFT: "Taslak",
    READY: "Hazır",
    RELEASED: "Serbest Bırakıldı",
    IN_PROGRESS: "Devam Ediyor",
    PAUSED: "Duraklatıldı",
    COMPLETED: "Tamamlandı",
    CANCELLED: "İptal",
  };

  return labels[status];
}

function createLocationCode({
  warehouseCode,
  code,
  aisle,
  section,
  level,
  bin,
}: {
  warehouseCode: string;
  code: string;
  aisle: string;
  section: string;
  level: string;
  bin: string;
}) {
  const position = [
    code,
    aisle,
    section,
    level,
    bin,
  ]
    .map(
      (value) =>
        value.trim()
    )
    .filter(Boolean)
    .join("-")
    .toUpperCase();

  return warehouseCode
    ? `${warehouseCode} / ${position}`
    : position;
}

export default async function RFWavePickingPage() {
  await AuthorizationService.requireRfAccess(
    "PICKING_EXECUTE"
  );

  const [
    waveRecords,
    targetRecords,
    sourceRecords,
  ] = await Promise.all([
    prisma.wave.findMany({
      where: {
        status: {
          in: [
            WaveStatus.RELEASED,
            WaveStatus.IN_PROGRESS,
          ],
        },

        distributions: {
          some: {
            status: {
              not:
                WaveDistributionStatus.CANCELLED,
            },
          },
        },
      },

      orderBy: [
        {
          priority:
            "desc",
        },
        {
          releasedAt:
            "asc",
        },
        {
          createdAt:
            "asc",
        },
      ],

      select: {
        id: true,
        waveNo: true,
        status: true,

        distributions: {
          where: {
            status: {
              not:
                WaveDistributionStatus.CANCELLED,
            },
          },

          orderBy: {
            sequenceNumber:
              "asc",
          },

          select: {
            id: true,
            sequenceNumber: true,

            lines: {
              select: {
                productId: true,
                productCode: true,
                productBarcode: true,
                productName: true,
                plannedQuantity: true,

                orderItem: {
                  select: {
                    quantity: true,
                    pickedQuantity: true,
                  },
                },
              },
            },
          },
        },
      },
    }),

    prisma.handlingUnit.findMany({
      where: {
        purpose:
          HandlingUnitPurpose.PICKING,

        status: {
          in: [
            HandlingUnitStatus.OPEN,
            HandlingUnitStatus.EMPTY,
            HandlingUnitStatus.STORED,
          ],
        },

        parentUnitId:
          null,

        assignedOrderId:
          null,
      },

      orderBy: {
        barcode:
          "asc",
      },

      select: {
        barcode: true,
        assignedWaveId: true,

        assignedWave: {
          select: {
            waveNo: true,
          },
        },

        items: {
          select: {
            quantity: true,
          },
        },
      },
    }),

    prisma.handlingUnit.findMany({
      where: {
        purpose:
          HandlingUnitPurpose.STOCK,

        status: {
          in: [
            HandlingUnitStatus.OPEN,
            HandlingUnitStatus.CLOSED,
            HandlingUnitStatus.STORED,
          ],
        },

        parentUnitId:
          null,

        assignedOrderId:
          null,

        assignedWaveId:
          null,

        locationId: {
          not:
            null,
        },

        items: {
          some: {
            quantity: {
              gt: 0,
            },
          },
        },
      },

      orderBy: {
        barcode:
          "asc",
      },

      select: {
        barcode: true,

        location: {
          select: {
            code: true,
            aisle: true,
            section: true,
            level: true,
            bin: true,

            warehouse: {
              select: {
                code: true,
              },
            },
          },
        },

        items: {
          where: {
            quantity: {
              gt: 0,
            },
          },

          select: {
            productId: true,
            quantity: true,
            reservedStock: true,

            product: {
              select: {
                code: true,
                barcode: true,
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const waves: WavePoolOption[] =
    waveRecords
      .map((wave) => {
        const taskMap =
          new Map<
            number,
            {
              productId: number;
              productCode: string;
              productBarcode: string;
              productName: string;
              plannedQuantity: number;
              pickedQuantity: number;
            }
          >();

        for (
          const distribution of
          wave.distributions
        ) {
          for (
            const line of
            distribution.lines
          ) {
            const existing =
              taskMap.get(
                line.productId
              );

            const linePickedQuantity =
              Math.min(
                line.plannedQuantity,
                line.orderItem
                  .pickedQuantity,
                line.orderItem
                  .quantity
              );

            if (existing) {
              existing.plannedQuantity +=
                line.plannedQuantity;

              existing.pickedQuantity +=
                linePickedQuantity;

              continue;
            }

            taskMap.set(
              line.productId,
              {
                productId:
                  line.productId,

                productCode:
                  line.productCode,

                productBarcode:
                  line.productBarcode,

                productName:
                  line.productName,

                plannedQuantity:
                  line.plannedQuantity,

                pickedQuantity:
                  linePickedQuantity,
              }
            );
          }
        }

        const tasks =
          Array.from(
            taskMap.values()
          )
            .map(
              (task) => ({
                ...task,

                pickedQuantity:
                  Math.min(
                    task.plannedQuantity,
                    task.pickedQuantity
                  ),

                remainingQuantity:
                  Math.max(
                    0,
                    task.plannedQuantity -
                      task.pickedQuantity
                  ),
              })
            )
            .sort(
              (
                left,
                right
              ) =>
                left.productCode.localeCompare(
                  right.productCode,
                  "tr"
                )
            );

        const plannedQuantity =
          tasks.reduce(
            (
              total,
              task
            ) =>
              total +
              task.plannedQuantity,
            0
          );

        const pickedQuantity =
          tasks.reduce(
            (
              total,
              task
            ) =>
              total +
              task.pickedQuantity,
            0
          );

        return {
          id:
            wave.id,

          waveNo:
            wave.waveNo,

          statusLabel:
            getWaveStatusLabel(
              wave.status
            ),

          plannedQuantity,

          pickedQuantity,

          remainingQuantity:
            Math.max(
              0,
              plannedQuantity -
                pickedQuantity
            ),

          tasks,
        };
      })
      .filter(
        (wave) =>
          wave.tasks.length >
          0
      );

  const targetUnits:
    WavePoolTargetOption[] =
    targetRecords.map(
      (unit) => ({
        barcode:
          unit.barcode,

        assignedWaveId:
          unit.assignedWaveId,

        assignedWaveNo:
          unit.assignedWave
            ?.waveNo ?? "",

        quantity:
          unit.items.reduce(
            (
              total,
              item
            ) =>
              total +
              item.quantity,
            0
          ),
      })
    );

  const sourceUnits:
    WavePoolSourceOption[] =
    sourceRecords.flatMap(
      (unit) => {
        if (!unit.location) {
          return [];
        }

        const locationCode =
          createLocationCode({
            warehouseCode:
              unit.location
                .warehouse.code,

            code:
              unit.location.code,

            aisle:
              unit.location.aisle,

            section:
              unit.location
                .section,

            level:
              unit.location.level,

            bin:
              unit.location.bin,
          });

        return unit.items
          .map(
            (item) => ({
              barcode:
                unit.barcode,

              locationCode,

              productId:
                item.productId,

              productCode:
                item.product.code,

              productBarcode:
                item.product
                  .barcode,

              productName:
                item.product.name,

              availableQuantity:
                Math.max(
                  0,
                  item.quantity -
                    item.reservedStock
                ),
            })
          )
          .filter(
            (item) =>
              item.availableQuantity >
              0
          );
      }
    );

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-widest text-blue-700">
            RF Depo Operasyonları
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Wave Havuz Toplama
          </h1>

          <p className="mt-2 max-w-3xl leading-7 text-slate-600">
            Wave siparişlerinin aynı SKU
            ihtiyaçlarını birleştirerek ortak
            Toplama THM&apos;ine aktarın.
            Müşteri ve sipariş ayrımı RF
            paketleme ekranında Sevk
            THM&apos;lerine yapılır.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/rf/picking"
            className="rounded-xl bg-slate-800 px-4 py-3 font-black text-white hover:bg-slate-700"
          >
            Sipariş Bazlı Toplama
          </Link>

          <Link
            href="/rf"
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-black text-slate-800 hover:bg-slate-50"
          >
            RF Menüsüne Dön
          </Link>
        </div>
      </div>

      {waves.length ===
      0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <h2 className="text-xl font-black">
            Havuz toplamaya açık Wave
            bulunmuyor
          </h2>

          <p className="mt-2 leading-6">
            Wave&apos;in serbest bırakılmış
            veya devam ediyor durumda olması
            ve dağılım planının oluşturulmuş
            olması gerekir.
          </p>

          <Link
            href="/rf"
            className="mt-5 inline-flex rounded-xl bg-blue-900 px-5 py-3 font-black text-white hover:bg-blue-800"
          >
            RF Menüsüne Dön
          </Link>
        </div>
      ) : targetUnits.length ===
        0 ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-950">
          <h2 className="text-xl font-black">
            Kullanılabilir Toplama THM
            bulunmuyor
          </h2>

          <p className="mt-2 leading-6">
            Wave havuz toplama işleminden
            önce PICKING amaçlı boş bir koli
            veya palet oluşturulmalıdır.
          </p>
        </div>
      ) : (
        <RFWavePoolPickingForm
          waves={waves}
          targetUnits={
            targetUnits
          }
          sourceUnits={
            sourceUnits
          }
        />
      )}
    </section>
  );
}
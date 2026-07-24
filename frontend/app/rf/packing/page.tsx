import {
  HandlingUnitPurpose,
  HandlingUnitStatus,
  ShippingHandlingUnitStatus,
  WaveDistributionStatus,
  WaveStatus,
} from "@prisma/client";

import Link from "next/link";

import {
  prisma,
} from "@/lib/prisma";

import RFPackingForm from "@/components/rf/RFPackingForm";

import {
  AuthorizationService,
} from "@/modules/authorization/services/authorization.service";

function getUnitTypeLabel(
  unitType: string,
) {
  return unitType === "PALLET"
    ? "Palet"
    : "Koli";
}

export default async function RFPackingPage() {
  await AuthorizationService.requireRfAccess(
    "PICKING_EXECUTE",
  );

  const distributions =
    await prisma.waveDistribution.findMany({
      where: {
        status: {
          in: [
            WaveDistributionStatus.PLANNED,
            WaveDistributionStatus.IN_PROGRESS,
          ],
        },
        wave: {
          status:
            WaveStatus.IN_PROGRESS,
        },
      },
      orderBy: [
        {
          wave: {
            waveNo: "asc",
          },
        },
        {
          sequenceNumber: "asc",
        },
      ],
      select: {
        id: true,
        waveId: true,
        sequenceNumber: true,
        distributionCode: true,
        customerCode: true,
        customerName: true,
        addressTitle: true,
        city: true,
        district: true,
        plannedOrderCount: true,
        plannedLineCount: true,
        plannedQuantity: true,
        packedQuantity: true,
        wave: {
          select: {
            waveNo: true,
          },
        },
        lines: {
          orderBy: [
            {
              productCode: "asc",
            },
            {
              orderId: "asc",
            },
          ],
          select: {
            id: true,
            orderId: true,
            orderItemId: true,
            productId: true,
            productCode: true,
            productBarcode: true,
            productName: true,
            plannedQuantity: true,
            packedQuantity: true,
            orderItem: {
              select: {
                pickedQuantity: true,
              },
            },
          },
        },
      },
    });

  const waveIds =
    Array.from(
      new Set(
        distributions.map(
          (distribution) =>
            distribution.waveId,
        ),
      ),
    );

  const distributionIds =
    distributions.map(
      (distribution) =>
        distribution.id,
    );

  const [
    sourceUnits,
    targetUnits,
  ] = await Promise.all([
    waveIds.length > 0
      ? prisma.handlingUnit.findMany({
          where: {
            purpose:
              HandlingUnitPurpose.PICKING,
            assignedOrderId: null,
            assignedWaveId: {
              in: waveIds,
            },
            status: {
              in: [
                HandlingUnitStatus.OPEN,
                HandlingUnitStatus.CLOSED,
                HandlingUnitStatus.STORED,
              ],
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
            barcode: "asc",
          },
          select: {
            id: true,
            barcode: true,
            unitType: true,
            assignedWaveId: true,
            items: {
              where: {
                quantity: {
                  gt: 0,
                },
              },
              select: {
                productId: true,
                quantity: true,
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
        })
      : Promise.resolve([]),

    prisma.handlingUnit.findMany({
      where: {
        purpose:
          HandlingUnitPurpose.SHIPPING,
        parentUnitId: null,
        status: {
          in: [
            HandlingUnitStatus.OPEN,
            HandlingUnitStatus.EMPTY,
            HandlingUnitStatus.STORED,
          ],
        },
        OR: [
          {
            shippingProfile: null,
            assignedOrderId: null,
            items: {
              none: {
                quantity: {
                  gt: 0,
                },
              },
            },
          },
          {
            shippingProfile: {
              is: {
                status:
                  ShippingHandlingUnitStatus.OPEN,
                waveDistributionId: {
                  in: distributionIds,
                },
              },
            },
          },
        ],
      },
      orderBy: {
        barcode: "asc",
      },
      select: {
        id: true,
        barcode: true,
        unitType: true,
        assignedWaveId: true,
        items: {
          select: {
            quantity: true,
          },
        },
        shippingProfile: {
          select: {
            waveDistributionId: true,
            packageSequence: true,
            status: true,
          },
        },
      },
    }),
  ]);

  const distributionOptions =
    distributions.map(
      (distribution) => {
        const productMap =
          new Map<
            number,
            {
              productId: number;
              productCode: string;
              productBarcode: string;
              productName: string;
              plannedQuantity: number;
              pickedQuantity: number;
              packedQuantity: number;
              availableQuantity: number;
            }
          >();

        for (
          const line of
          distribution.lines
        ) {
          const pickedQuantity =
            Math.min(
              line.plannedQuantity,
              line.orderItem
                .pickedQuantity,
            );

          const availableQuantity =
            Math.max(
              0,
              pickedQuantity -
                line.packedQuantity,
            );

          const current =
            productMap.get(
              line.productId,
            );

          if (current) {
            current.plannedQuantity +=
              line.plannedQuantity;
            current.pickedQuantity +=
              pickedQuantity;
            current.packedQuantity +=
              line.packedQuantity;
            current.availableQuantity +=
              availableQuantity;
          } else {
            productMap.set(
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
                pickedQuantity,
                packedQuantity:
                  line.packedQuantity,
                availableQuantity,
              },
            );
          }
        }

        return {
          id: distribution.id,
          waveId:
            distribution.waveId,
          waveNo:
            distribution.wave.waveNo,
          sequenceNumber:
            distribution.sequenceNumber,
          distributionCode:
            distribution.distributionCode,
          customerCode:
            distribution.customerCode ??
            "",
          customerName:
            distribution.customerName,
          addressTitle:
            distribution.addressTitle ??
            "Müşteri ana adresi",
          city:
            distribution.city,
          district:
            distribution.district,
          plannedOrderCount:
            distribution.plannedOrderCount,
          plannedLineCount:
            distribution.plannedLineCount,
          plannedQuantity:
            distribution.plannedQuantity,
          packedQuantity:
            distribution.packedQuantity,
          remainingQuantity:
            Math.max(
              0,
              distribution.plannedQuantity -
                distribution.packedQuantity,
            ),
          products:
            Array.from(
              productMap.values(),
            ),
        };
      },
    );

  const sourceOptions =
    sourceUnits.map((unit) => ({
      id: unit.id,
      barcode: unit.barcode,
      unitType:
        getUnitTypeLabel(
          unit.unitType,
        ),
      waveId:
        unit.assignedWaveId!,
      totalQuantity:
        unit.items.reduce(
          (total, item) =>
            total + item.quantity,
          0,
        ),
      products:
        unit.items.map((item) => ({
          productId:
            item.productId,
          productCode:
            item.product.code,
          productBarcode:
            item.product.barcode,
          productName:
            item.product.name,
          quantity:
            item.quantity,
        })),
    }));

  const targetOptions =
    targetUnits.map((unit) => ({
      id: unit.id,
      barcode: unit.barcode,
      unitType:
        getUnitTypeLabel(
          unit.unitType,
        ),
      waveId:
        unit.assignedWaveId,
      distributionId:
        unit.shippingProfile
          ?.waveDistributionId ??
        null,
      packageSequence:
        unit.shippingProfile
          ?.packageSequence ?? null,
      totalQuantity:
        unit.items.reduce(
          (total, item) =>
            total + item.quantity,
          0,
        ),
      isOpen:
        unit.shippingProfile
          ?.status ===
          ShippingHandlingUnitStatus.OPEN,
    }));

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-700">
            RF Operasyonu
          </p>

          <h1 className="mt-1 text-2xl font-black">
            Wave Paketleme ve Dağılım
          </h1>
        </div>

        <Link
          href="/rf"
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold shadow-sm"
        >
          ← Menü
        </Link>
      </div>

      <RFPackingForm
        distributions={
          distributionOptions
        }
        sourceUnits={
          sourceOptions
        }
        targetUnits={
          targetOptions
        }
      />
    </section>
  );
}

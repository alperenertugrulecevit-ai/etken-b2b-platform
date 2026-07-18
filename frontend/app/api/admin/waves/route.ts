import {
  Prisma,
  WavePriority,
  WaveStatus,
  WaveType,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createWave } from "@/lib/wms/wave-service";

export const dynamic = "force-dynamic";

type CreateWaveOrderInput = {
  orderNumber: string;
  customerCode?: string;
  customerName?: string;
  storeCode?: string;
  storeName?: string;
  lineCount?: number;
  plannedQuantity?: number;
};

type CreateWaveInput = {
  name?: string;
  type?: WaveType;
  priority?: WavePriority;
  plannedStartAt?: string;
  plannedFinishAt?: string;
  notes?: string;
  createdBy?: string;
  orders?: CreateWaveOrderInput[];
};

function asNonNegativeInteger(
  value: unknown,
  fallback = 0
): number {
  const numberValue = Number(value);

  if (
    !Number.isInteger(numberValue) ||
    numberValue < 0
  ) {
    return fallback;
  }

  return numberValue;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

function isWaveType(value: unknown): value is WaveType {
  return Object.values(WaveType).includes(
    value as WaveType
  );
}

function isWavePriority(
  value: unknown
): value is WavePriority {
  return Object.values(WavePriority).includes(
    value as WavePriority
  );
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const statusParam = searchParams.get("status");
  const search = searchParams.get("search")?.trim();

  const rawPage = Number(
    searchParams.get("page") ?? 1
  );

  const rawPageSize = Number(
    searchParams.get("pageSize") ?? 20
  );

  const page = Number.isFinite(rawPage)
    ? Math.max(1, Math.floor(rawPage))
    : 1;

  const pageSize = Number.isFinite(rawPageSize)
    ? Math.min(
        100,
        Math.max(1, Math.floor(rawPageSize))
      )
    : 20;

  const status =
    statusParam &&
    Object.values(WaveStatus).includes(
      statusParam as WaveStatus
    )
      ? (statusParam as WaveStatus)
      : undefined;

  const where: Prisma.WaveWhereInput = {
    ...(status ? { status } : {}),

    ...(search
      ? {
          OR: [
            {
              waveNo: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              orders: {
                some: {
                  orderNumber: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [waves, total] = await Promise.all([
    prisma.wave.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,

      orderBy: [
        {
          priority: "desc",
        },
        {
          createdAt: "desc",
        },
      ],

      include: {
        _count: {
          select: {
            orders: true,
            assignments: true,
          },
        },
      },
    }),

    prisma.wave.count({
      where,
    }),
  ]);

  return NextResponse.json({
    data: waves,

    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body =
      (await request.json()) as CreateWaveInput;

    const incomingOrders = Array.isArray(body.orders)
      ? body.orders
      : [];

    const invalidOrderExists = incomingOrders.some(
      (order) =>
        typeof order.orderNumber !== "string" ||
        order.orderNumber.trim().length === 0
    );

    if (invalidOrderExists) {
      return NextResponse.json(
        {
          error:
            "Wave'e eklenecek tüm siparişlerin sipariş numarası zorunludur.",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedOrders = incomingOrders.map(
      (order) => ({
        orderNumber: order.orderNumber.trim(),
        customerCode:
          order.customerCode?.trim() || null,
        customerName:
          order.customerName?.trim() || null,
        storeCode:
          order.storeCode?.trim() || null,
        storeName:
          order.storeName?.trim() || null,
        lineCount: asNonNegativeInteger(
          order.lineCount
        ),
        plannedQuantity: asNonNegativeInteger(
          order.plannedQuantity
        ),
      })
    );

    const uniqueOrderNumbers = new Set(
      normalizedOrders.map(
        (order) => order.orderNumber
      )
    );

    if (
      uniqueOrderNumbers.size !==
      normalizedOrders.length
    ) {
      return NextResponse.json(
        {
          error:
            "Aynı sipariş numarası wave içinde birden fazla kez kullanılamaz.",
        },
        {
          status: 400,
        }
      );
    }

    const plannedStartAt = parseDate(
      body.plannedStartAt
    );

    const plannedFinishAt = parseDate(
      body.plannedFinishAt
    );

    if (
      plannedStartAt &&
      plannedFinishAt &&
      plannedFinishAt <= plannedStartAt
    ) {
      return NextResponse.json(
        {
          error:
            "Planlanan bitiş zamanı başlangıçtan sonra olmalıdır.",
        },
        {
          status: 400,
        }
      );
    }

    const wave = await createWave({
      name: body.name?.trim() || null,

      type: isWaveType(body.type)
        ? body.type
        : WaveType.MIXED,

      priority: isWavePriority(body.priority)
        ? body.priority
        : WavePriority.NORMAL,

      plannedStartAt,
      plannedFinishAt,

      notes: body.notes?.trim() || null,
      createdBy: body.createdBy?.trim() || null,

      orders: normalizedOrders,
    });

    return NextResponse.json(
      {
        data: wave,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Wave oluşturma hatası:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Wave oluşturulurken beklenmeyen bir hata oluştu.";

    const isValidationError =
      message.includes("bulunamadı") ||
      message.includes("yinelenen") ||
      message.includes("zorunludur");

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: isValidationError ? 400 : 500,
      }
    );
  }
}
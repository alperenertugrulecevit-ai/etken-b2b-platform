import Link from "next/link";
import {
  Prisma,
  StockMovementType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import TableHeaderMultiFilter from "@/components/admin/TableHeaderMultiFilter";
import StockMovementsTable from "@/components/admin/StockMovementsTable";

type SearchParams = Promise<{
  search?: string;
  movementType?: string | string[];
  startDate?: string;
  endDate?: string;
  page?: string;
  warehouseId?: string;
}>;

type Props = {
  searchParams: SearchParams;
};

const PAGE_SIZE = 50;

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatSignedNumber(value: number) {
  if (value > 0) {
    return `+${formatNumber(value)}`;
  }

  return formatNumber(value);
}

function getMovementLabel(type: string) {
  const labels: Record<string, string> = {
    INITIAL_STOCK: "Açılış Stoğu",
    PURCHASE_RECEIPT: "Mal Kabul",
    MANUAL_IN: "Manuel Stok Girişi",
    MANUAL_OUT: "Manuel Stok Çıkışı",
    RESERVATION_CREATE: "Rezervasyon Oluşturma",
    RESERVATION_RELEASE: "Rezervasyon Çözme",
    SALE_SHIPMENT: "Satış Sevkiyatı",
    SALE_RETURN: "İade Girişi",
    STOCK_RETURN: "Stoğa Geri Alma",
    STOCK_PICKING: "Toplama",
    COUNT_INCREASE: "Sayım Fazlası",
    COUNT_DECREASE: "Sayım Eksiği",
    TRANSFER_IN: "Transfer Girişi",
    TRANSFER_OUT: "Transfer Çıkışı",
    LOST_STOCK_IN: "Kayıp Stok Girişi",
    LOST_STOCK_OUT: "Kayıp Stok Çıkışı",
  };

  return labels[type] ?? type;
}

function getMovementClass(type: string) {
  const classes: Record<string, string> = {
    INITIAL_STOCK:
      "bg-slate-100 text-slate-700",

    PURCHASE_RECEIPT:
      "bg-green-100 text-green-700",

    MANUAL_IN:
      "bg-green-100 text-green-700",

    MANUAL_OUT:
      "bg-red-100 text-red-700",

    RESERVATION_CREATE:
      "bg-orange-100 text-orange-700",

    RESERVATION_RELEASE:
      "bg-blue-100 text-blue-700",

    SALE_SHIPMENT:
      "bg-red-100 text-red-700",

    SALE_RETURN:
      "bg-green-100 text-green-700",

    STOCK_RETURN:
      "bg-cyan-100 text-cyan-800",

    STOCK_PICKING:
      "bg-indigo-100 text-indigo-800",

    COUNT_INCREASE:
      "bg-emerald-100 text-emerald-700",

    COUNT_DECREASE:
      "bg-rose-100 text-rose-700",

    TRANSFER_IN:
      "bg-cyan-100 text-cyan-700",

    TRANSFER_OUT:
      "bg-violet-100 text-violet-700",

    LOST_STOCK_IN:
      "bg-amber-100 text-amber-800",

    LOST_STOCK_OUT:
      "bg-red-100 text-red-800",
  };

  return (
    classes[type] ??
    "bg-slate-100 text-slate-700"
  );
}

function isMovementType(
  value: string
): value is StockMovementType {
  return Object.values(
    StockMovementType
  ).includes(value as StockMovementType);
}

function createStartDate(value: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  return Number.isNaN(date.getTime())
    ? undefined
    : date;
}

function createEndDate(value: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(
    `${value}T23:59:59.999`
  );

  return Number.isNaN(date.getTime())
    ? undefined
    : date;
}

function createQueryString(
  values: Record<
    string,
    string | string[] | number | undefined
  >
) {
  const params = new URLSearchParams();

  Object.entries(values).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        String(value).trim() !== ""
      ) {
        if (Array.isArray(value)) {
          value.forEach((item) => params.append(key, item));
        } else {
          params.set(key, String(value));
        }
      }
    }
  );

  return params.toString();
}

export default async function StockMovementsPage({
  searchParams,
}: Props) {
  const query = await searchParams;

  const search =
    query.search?.trim() ?? "";

  const movementTypes = (Array.isArray(query.movementType) ? query.movementType : query.movementType ? [query.movementType] : []).filter(isMovementType);

  const startDate =
    query.startDate?.trim() ?? "";

  const endDate =
    query.endDate?.trim() ?? "";

  const warehouseIdValue=query.warehouseId?.trim()??"";
  const warehouseIdNumber=Number(warehouseIdValue);
  const selectedWarehouseId=Number.isInteger(warehouseIdNumber)&&warehouseIdNumber>0?warehouseIdNumber:null;

  const requestedPage = Number(
    query.page ?? "1"
  );

  const currentPage =
    Number.isInteger(requestedPage) &&
    requestedPage > 0
      ? requestedPage
      : 1;

  const parsedStartDate =
    createStartDate(startDate);

  const parsedEndDate =
    createEndDate(endDate);

  const where: Prisma.StockMovementWhereInput =
    {};

  if (selectedWarehouseId) where.warehouseId=selectedWarehouseId;

  if (search) {
    where.OR = [
      {
        product: {
          is: {
            code: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },

      {
        product: {
          is: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },

      {
        documentNumber: {
          contains: search,
          mode: "insensitive",
        },
      },

      {
        description: {
          contains: search,
          mode: "insensitive",
        },
      },

      {
        order: {
          is: {
            orderNumber: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
    ];
  }

  if (movementTypes.length) {
    where.movementType = { in: movementTypes };
  }

  if (
    parsedStartDate ||
    parsedEndDate
  ) {
    where.createdAt = {
      ...(parsedStartDate
        ? {
            gte: parsedStartDate,
          }
        : {}),

      ...(parsedEndDate
        ? {
            lte: parsedEndDate,
          }
        : {}),
    };
  }

  const totalRecords =
    await prisma.stockMovement.count({
      where,
    });

  const totalPages = Math.max(
    1,
    Math.ceil(
      totalRecords / PAGE_SIZE
    )
  );

  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  );

  const skip =
    (safeCurrentPage - 1) *
    PAGE_SIZE;

  const [movements, totals, warehouses] =
    await Promise.all([
      prisma.stockMovement.findMany({
        where,

        orderBy: [
          {
            createdAt: "desc",
          },
          {
            id: "desc",
          },
        ],

        skip,
        take: PAGE_SIZE,

        include: {
          warehouse: { select: { code: true } },
          product: {
            select: {
              id: true,
              code: true,
              barcode: true,
              name: true,
            },
          },

          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
            },
          },
        },
      }),

      prisma.stockMovement.aggregate({
        where,

        _sum: {
          physicalChange: true,
          reservedChange: true,
        },
      }),
      prisma.warehouse.findMany({where:{isActive:true,code:{not:"KYP001"}},orderBy:{code:"asc"},select:{id:true,code:true,name:true}}),
    ]);

  /*
   * Giriş ve çıkışı ayrı hesaplamak için,
   * filtreye uyan hareketlerin değişim alanlarını
   * ayrıca okuyoruz.
   */
  const filteredChanges =
    await prisma.stockMovement.findMany({
      where,

      select: {
        physicalChange: true,
        reservedChange: true,
      },
    });

  const totalPhysicalIn =
    filteredChanges.reduce(
      (total, movement) =>
        movement.physicalChange > 0
          ? total +
            movement.physicalChange
          : total,
      0
    );

  const totalPhysicalOut =
    filteredChanges.reduce(
      (total, movement) =>
        movement.physicalChange < 0
          ? total +
            Math.abs(
              movement.physicalChange
            )
          : total,
      0
    );

  const totalReservationIncrease =
    filteredChanges.reduce(
      (total, movement) =>
        movement.reservedChange > 0
          ? total +
            movement.reservedChange
          : total,
      0
    );

  const totalReservationDecrease =
    filteredChanges.reduce(
      (total, movement) =>
        movement.reservedChange < 0
          ? total +
            Math.abs(
              movement.reservedChange
            )
          : total,
      0
    );

  const baseQuery = {
    search,
    movementType: movementTypes,
    startDate,
    endDate,
    warehouseId: warehouseIdValue,
  };

  const previousPageUrl =
    `/admin/stock/movements?${createQueryString({
      ...baseQuery,
      page: Math.max(
        1,
        safeCurrentPage - 1
      ),
    })}`;

  const nextPageUrl =
    `/admin/stock/movements?${createQueryString({
      ...baseQuery,
      page: Math.min(
        totalPages,
        safeCurrentPage + 1
      ),
    })}`;

  const exportUrl =
    `/admin/stock/movements/export?${createQueryString(
      baseQuery
    )}`;

  const firstRecord =
    totalRecords === 0
      ? 0
      : skip + 1;

  const lastRecord = Math.min(
    skip + movements.length,
    totalRecords
  );

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Stok Hareketleri
          </h1>

          <p className="mt-2 text-gray-500">
            Fiziksel stok, rezervasyon,
            sevkiyat, sayım ve manuel
            hareketleri inceleyin.
          </p>
        </div>

              <div className="flex flex-wrap gap-3">
          <a
            href={exportUrl}
            className="rounded-xl bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
          >
            📊 CSV İndir
          </a>

          <Link
            href="/admin/stock/thm-movements"
            className="rounded-xl bg-cyan-800 px-5 py-3 font-semibold text-white hover:bg-cyan-700"
          >
            🔄 THM Hareketleri
          </Link>

          <Link
            href="/admin/stock/manual"
            className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800"
          >
            + Manuel Stok İşlemi
          </Link>

          <Link
            href="/admin/products"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
          >
            Ürün Yönetimi
          </Link>
        </div>
      </div>

      {/* ÖZET KARTLARI */}

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Hareket Sayısı
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-900">
            {formatNumber(
              totalRecords
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Fiziksel Giriş
          </p>

          <p className="mt-3 text-4xl font-bold text-green-700">
            +
            {formatNumber(
              totalPhysicalIn
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Fiziksel Çıkış
          </p>

          <p className="mt-3 text-4xl font-bold text-red-700">
            -
            {formatNumber(
              totalPhysicalOut
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Rezervasyon Artışı
          </p>

          <p className="mt-3 text-4xl font-bold text-orange-700">
            +
            {formatNumber(
              totalReservationIncrease
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Rezervasyon Azalışı
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-700">
            -
            {formatNumber(
              totalReservationDecrease
            )}
          </p>
        </article>
      </div>

      {/* FİLTRELER */}

      <form className="mt-8 rounded-2xl bg-white p-6 shadow">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
          <label className="xl:col-span-2">
            <span className="mb-2 block text-sm font-semibold">
              Arama
            </span>

            <input
              name="search"
              defaultValue={search}
              placeholder="Ürün kodu, ürün adı, belge veya sipariş no"
              className="w-full rounded-xl border p-4"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Hareket Tipi
            </span>

            <select
              name="movementType"
              multiple
              defaultValue={movementTypes}
              className="min-h-40 w-full rounded-xl border bg-white p-4"
            >

              {Object.values(
                StockMovementType
              ).map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {getMovementLabel(type)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">Depo Kodu</span>
            <select name="warehouseId" defaultValue={warehouseIdValue} className="w-full rounded-xl border bg-white p-4">
              <option value="">Tüm Depolar</option>
              {warehouses.map(w=><option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Başlangıç Tarihi
            </span>

            <input
              name="startDate"
              type="date"
              defaultValue={startDate}
              className="w-full rounded-xl border p-4"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold">
              Bitiş Tarihi
            </span>

            <input
              name="endDate"
              type="date"
              defaultValue={endDate}
              className="w-full rounded-xl border p-4"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-blue-900 px-6 py-3 font-bold text-white hover:bg-blue-800"
          >
            Filtrele
          </button>

          <Link
            href="/admin/stock/movements"
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold hover:bg-slate-50"
          >
            Filtreleri Temizle
          </Link>
        </div>
      </form>

      {/* HAREKET TABLOSU */}
      <StockMovementsTable rows={movements.map(movement=>({
        id:movement.id,date:formatDate(movement.createdAt),warehouseCode:movement.warehouse?.code??"-",barcode:movement.product.barcode||"-",productId:movement.product.id,
        productCode:movement.product.code,productName:movement.product.name,location:"-",thm:"-",type:movement.movementType,
        document:movement.documentNumber||"-",orderId:movement.order?.id??null,orderNumber:movement.order?.orderNumber??null,
        physicalChange:movement.physicalChange,reservedChange:movement.reservedChange,physicalBalance:movement.physicalBalanceAfter,
        reservedBalance:movement.reservedBalanceAfter,availableBalance:movement.availableBalanceAfter,description:movement.description||"-",
      }))}/>

      {/* SAYFALAMA */}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-white p-5 shadow">
        <div>
          <p className="font-semibold">
            Sayfa {safeCurrentPage} /{" "}
            {totalPages}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {firstRecord} - {lastRecord} arası
            gösteriliyor. Toplam{" "}
            {formatNumber(totalRecords)} kayıt.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {safeCurrentPage > 1 ? (
            <Link
              href={previousPageUrl}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
            >
              ← Önceki Sayfa
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-5 py-3 font-semibold text-slate-400">
              ← Önceki Sayfa
            </span>
          )}

          {safeCurrentPage <
          totalPages ? (
            <Link
              href={nextPageUrl}
              className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800"
            >
              Sonraki Sayfa →
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-400">
              Sonraki Sayfa →
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 text-right text-xs text-gray-400">
        Net fiziksel değişim:{" "}
        {formatSignedNumber(
          totals._sum.physicalChange ??
            0
        )}{" "}
        · Net rezervasyon değişimi:{" "}
        {formatSignedNumber(
          totals._sum.reservedChange ??
            0
        )}
      </div>
    </section>
  );
}
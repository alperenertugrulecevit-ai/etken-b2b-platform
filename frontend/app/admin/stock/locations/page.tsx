import Link from "next/link";

import { prisma } from "@/lib/prisma";

import LocationStockPlacementForm from "@/components/admin/LocationStockPlacementForm";

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
    .join("-");
}

function getLocationTypeLabel(
  locationType: string
) {
  const labels: Record<string, string> = {
    PALLET: "Palet",
    BOX: "Koli",
    HANGING: "Askılı",
    FLOOR: "Zemin",
    RETURN: "İade",
    QUALITY: "Kalite",
    RFID: "RFID",
    SHIPPING: "Mal Çıkış",
    RECEIVING: "Mal Kabul",
    QUARANTINE: "Karantina",
  };

  return (
    labels[locationType] ??
    locationType
  );
}

export default async function LocationStocksPage() {
  const [
    products,
    warehouses,
    locations,
    locationStocks,
  ] = await Promise.all([
    prisma.product.findMany({
      where: {
        isActive: true,
        stock: {
          gt: 0,
        },
      },

      orderBy: [
        {
          code: "asc",
        },
        {
          name: "asc",
        },
      ],

      select: {
        id: true,
        code: true,
        name: true,
        stock: true,

        locationStocks: {
          select: {
            quantity: true,
          },
        },
      },
    }),

    prisma.warehouse.findMany({
      where: {
        isActive: true,
      },

      orderBy: {
        code: "asc",
      },

      select: {
        id: true,
        code: true,
        name: true,
      },
    }),

    prisma.warehouseLocation.findMany({
      where: {
        isActive: true,

        warehouse: {
          isActive: true,
        },
      },

      orderBy: [
        {
          warehouse: {
            code: "asc",
          },
        },
        {
          sortOrder: "asc",
        },
        {
          code: "asc",
        },
        {
          section: "asc",
        },
        {
          level: "asc",
        },
        {
          bin: "asc",
        },
      ],

      select: {
        id: true,
        warehouseId: true,
        code: true,
        section: true,
        level: true,
        bin: true,
        locationType: true,
      },
    }),

    prisma.warehouseLocationStock.findMany({
      where: {
        quantity: {
          gt: 0,
        },
      },

      orderBy: [
        {
          location: {
            warehouse: {
              code: "asc",
            },
          },
        },
        {
          location: {
            sortOrder: "asc",
          },
        },
        {
          product: {
            code: "asc",
          },
        },
      ],

      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            stock: true,
          },
        },

        location: {
          select: {
            id: true,
            code: true,
            section: true,
            level: true,
            bin: true,
            locationType: true,

            warehouse: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const productOptions =
    products.map((product) => {
      const allocatedStock =
        product.locationStocks.reduce(
          (total, locationStock) =>
            total +
            locationStock.quantity,
          0
        );

      return {
        id: product.id,
        code: product.code,
        name: product.name,

        physicalStock:
          product.stock,

        allocatedStock,

        unallocatedStock:
          product.stock -
          allocatedStock,
      };
    });

  const locationOptions =
    locations.map((location) => ({
      id: location.id,

      warehouseId:
        location.warehouseId,

      fullCode:
        createFullLocationCode({
          code: location.code,
          section: location.section,
          level: location.level,
          bin: location.bin,
        }),

      locationType:
        getLocationTypeLabel(
          location.locationType
        ),
    }));

  const totalPhysicalStock =
    products.reduce(
      (total, product) =>
        total + product.stock,
      0
    );

  const totalAllocatedStock =
    locationStocks.reduce(
      (total, locationStock) =>
        total +
        locationStock.quantity,
      0
    );

  const totalUnallocatedStock =
    totalPhysicalStock -
    totalAllocatedStock;

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Lokasyon Bazlı Stok
          </h1>

          <p className="mt-2 text-gray-500">
            Ürünlerin fiziksel stoklarını
            depo lokasyonlarına dağıtın ve
            lokasyon bakiyelerini inceleyin.
          </p>
        </div>

        <Link
          href="/admin/warehouses"
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
        >
          Depo Yönetimine Git
        </Link>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">
            Fiziksel Stok
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-900">
            {totalPhysicalStock.toLocaleString(
              "tr-TR"
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">
            Lokasyona Yerleştirilen
          </p>

          <p className="mt-3 text-4xl font-bold text-violet-700">
            {totalAllocatedStock.toLocaleString(
              "tr-TR"
            )}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">
            Yerleştirilmemiş Stok
          </p>

          <p
            className={`mt-3 text-4xl font-bold ${
              totalUnallocatedStock > 0
                ? "text-orange-700"
                : "text-green-700"
            }`}
          >
            {totalUnallocatedStock.toLocaleString(
              "tr-TR"
            )}
          </p>
        </article>
      </div>

      <div className="mt-8 grid gap-8 2xl:grid-cols-[460px_1fr]">
        <LocationStockPlacementForm
          products={productOptions}
          warehouses={warehouses}
          locations={locationOptions}
        />

        <div className="overflow-x-auto rounded-2xl bg-white shadow">
          <table className="w-full min-w-[1300px] text-left">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="p-4">
                  Depo
                </th>

                <th className="p-4">
                  Lokasyon
                </th>

                <th className="p-4">
                  Lokasyon Tipi
                </th>

                <th className="p-4">
                  Ürün Kodu
                </th>

                <th className="p-4">
                  Ürün
                </th>

                <th className="p-4">
                  Lokasyon Stoğu
                </th>

                <th className="p-4">
                  Rezerve
                </th>

                <th className="p-4">
                  Kullanılabilir
                </th>

                <th className="p-4">
                  Toplam Fiziksel
                </th>
              </tr>
            </thead>

            <tbody>
              {locationStocks.map(
                (locationStock) => {
                  const availableStock =
                    locationStock.quantity -
                    locationStock.reservedStock;

                  const fullLocationCode =
                    createFullLocationCode({
                      code:
                        locationStock.location
                          .code,

                      section:
                        locationStock.location
                          .section,

                      level:
                        locationStock.location
                          .level,

                      bin:
                        locationStock.location
                          .bin,
                    });

                  return (
                    <tr
                      key={locationStock.id}
                      className="border-b hover:bg-slate-50"
                    >
                      <td className="p-4">
                        <p className="font-bold text-blue-900">
                          {
                            locationStock.location
                              .warehouse.code
                          }
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {
                            locationStock.location
                              .warehouse.name
                          }
                        </p>
                      </td>

                      <td className="p-4">
                        <span className="whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 font-mono font-bold text-white">
                          {fullLocationCode}
                        </span>
                      </td>

                      <td className="p-4">
                        {getLocationTypeLabel(
                          locationStock.location
                            .locationType
                        )}
                      </td>

                      <td className="p-4 font-bold text-blue-900">
                        {
                          locationStock.product
                            .code
                        }
                      </td>

                      <td className="p-4 font-semibold">
                        {
                          locationStock.product
                            .name
                        }
                      </td>

                      <td className="p-4 text-xl font-bold">
                        {
                          locationStock.quantity
                        }
                      </td>

                      <td className="p-4 font-semibold text-orange-700">
                        {
                          locationStock.reservedStock
                        }
                      </td>

                      <td className="p-4 font-bold text-green-700">
                        {availableStock}
                      </td>

                      <td className="p-4 font-semibold">
                        {
                          locationStock.product
                            .stock
                        }
                      </td>
                    </tr>
                  );
                }
              )}

              {locationStocks.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="p-12 text-center text-gray-500"
                  >
                    Henüz lokasyona
                    yerleştirilmiş ürün stoğu
                    bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
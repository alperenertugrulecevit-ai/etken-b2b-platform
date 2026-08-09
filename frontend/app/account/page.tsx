import {
  CustomerUserRole,
  OrderStatus,
  UserType,
} from "@prisma/client";

import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import Header from "@/components/layout/Header";
import ProductImage from "@/components/products/ProductImage";

import {
  prisma,
} from "@/lib/prisma";

import {
  SessionService,
} from "@/modules/auth/services/session.service";

import {
  customerLogoutAction,
} from "./actions";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

export const metadata = {
  title:
    "Kurumsal Hesabım | ETKEN Ofis",
};

function formatCurrency(
  value: number,
) {
  return value.toLocaleString(
    "tr-TR",
    {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
}

function calculateDiscountedPrice(
  price: number,
  discountRate: number,
) {
  return (
    Math.round(
      (
        price *
          (1 -
            discountRate /
              100) +
        Number.EPSILON
      ) *
        100,
    ) / 100
  );
}

function getAvailableStock(
  stock: number,
  reservedStock: number,
) {
  return Math.max(
    0,
    stock -
      reservedStock,
  );
}

export default async function AccountPage() {
  const user =
    await SessionService.getCurrentUser();

  if (
    !user ||
    user.userType !==
      UserType.CUSTOMER ||
    !user.customer ||
    !user.customer.isActive ||
    !user.customerId
  ) {
    redirect(
      "/customer-login",
    );
  }

  const customerId =
    user.customerId;

  const canViewDashboard =
    user.customerRole ===
    CustomerUserRole.CUSTOMER_ADMIN;

  const displayName =
    user.fullName?.trim() ||
    user.username;

  const [
    customer,
    newProductCandidates,
    favoriteGroups,
    opportunityCandidates,
  ] =
    await Promise.all([
      prisma.customer.findUnique({
        where: {
          id:
            customerId,
        },

        select: {
          companyName:
            true,
          customerCode:
            true,
          discountRate:
            true,
        },
      }),

      prisma.product.findMany({
where: {
  isActive: true,

  imageUrl: {
    not: null,
  },
},

        orderBy: {
          createdAt:
            "desc",
        },

        take: 20,

        select: {
          id: true,
          code: true,
          name: true,
          brand: true,
          category: true,
          price: true,
          stock: true,
          reservedStock: true,
          imageUrl: true,
        },
      }),

      prisma.orderItem.groupBy({
        by: [
          "productId",
        ],

        where: {
          order: {
            customerId,

            status: {
              not:
                OrderStatus.CANCELLED,
            },
          },
        },

        _sum: {
          quantity:
            true,
        },

        orderBy: {
          _sum: {
            quantity:
              "desc",
          },
        },

        take: 8,
      }),

      prisma.product.findMany({
        where: {
          isActive:
            true,

          stock: {
            gt: 0,
          },

          ownStock:
            true,

          imageUrl: {
            not: null,
          },
        },

        orderBy: [
          {
            createdAt:
              "desc",
          },
          {
            id:
              "desc",
          },
        ],

        take: 20,

        select: {
          id: true,
          code: true,
          name: true,
          brand: true,
          category: true,
          price: true,
          stock: true,
          reservedStock: true,
          imageUrl: true,
        },
      }),
    ]);

  if (
    !customer
  ) {
    redirect(
      "/customer-login",
    );
  }

const newProducts =
  newProductCandidates
    .filter(
      (product) =>
        Boolean(
          product.imageUrl,
        ),
    )
    .slice(
      0,
      8,
    );

  const opportunityProduct =
    opportunityCandidates.find(
      (
        product,
      ) =>
        Boolean(
          product.imageUrl,
        ) &&
        getAvailableStock(
          product.stock,
          product.reservedStock,
        ) > 0,
    ) ??
    null;

  const favoriteProductIds =
    favoriteGroups.map(
      (
        group,
      ) =>
        group.productId,
    );

  const favoriteProductRows =
    favoriteProductIds.length >
    0
      ? await prisma.product.findMany({
          where: {
            id: {
              in:
                favoriteProductIds,
            },

            isActive:
              true,

            imageUrl: {
              not: null,
            },
          },

          select: {
            id: true,
            code: true,
            name: true,
            brand: true,
            category: true,
            price: true,
            stock: true,
            reservedStock: true,
            imageUrl: true,
          },
        })
      : [];

  const favoriteProductMap =
    new Map(
      favoriteProductRows
        .filter(
          (
            product,
          ) =>
            Boolean(
              product.imageUrl,
            ) &&
            getAvailableStock(
              product.stock,
              product.reservedStock,
            ) > 0,
        )
        .map(
          (
            product,
          ) => [
            product.id,
            product,
          ],
        ),
    );

  const favoriteProducts =
    favoriteGroups
      .map(
        (
          group,
        ) => {
          const product =
            favoriteProductMap.get(
              group.productId,
            );

          return product
            ? {
                ...product,

                purchasedQuantity:
                  group._sum
                    .quantity ??
                  0,
              }
            : null;
        },
      )
      .filter(
        (
          product,
        ): product is NonNullable<
          typeof product
        > =>
          product !==
          null,
      )
      .slice(
        0,
        8,
      );

  const opportunityPrice =
    opportunityProduct
      ? calculateDiscountedPrice(
          opportunityProduct.price,
          customer.discountRate,
        )
      : 0;

  return (
    <>
      <Header />

      <main className="mx-auto min-h-screen max-w-[1180px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#EF4B23]">
              Kurumsal Hesabım
            </p>

            <h1 className="mt-1 text-xl font-black text-slate-900 lg:text-2xl">
              {
                customer.companyName
              }
            </h1>

            <p className="mt-1 text-sm font-semibold text-slate-700">
              Kullanıcı:{" "}
              {
                displayName
              }
            </p>

            <p className="mt-1 text-sm text-slate-600">
              Müşteri kodu:{" "}
              {
                customer.customerCode
              }
            </p>
          </div>

          <form
            action={
              customerLogoutAction
            }
          >
            <button
              type="submit"
              className="rounded-lg bg-[#202B38] px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
            >
              Güvenli Çıkış
            </button>
          </form>
        </div>

        <section className="mt-5">
          <h2 className="text-xl font-black text-slate-900">
            Hesap Menüsü
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Yapmak istediğiniz işlemi seçin.
          </p>

          <div className="mt-3 flex gap-1.5 overflow-x-hidden sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible xl:grid-cols-5">
  {canViewDashboard && (
    <Link
      href="/account/dashboard"
      className="group flex min-w-0 flex-1 flex-col items-center rounded-xl border border-slate-200 border-t-4 border-t-cyan-600 bg-white px-1.5 py-2 text-center text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md sm:block sm:p-3.5 sm:text-left"
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-50 text-sm sm:h-9 sm:w-9 sm:text-xl">
        📊
      </div>

      <h3 className="mt-1 text-[9px] font-black leading-3 text-cyan-800 sm:mt-3 sm:text-sm sm:leading-normal">
        Dashboard
      </h3>

      <p className="hidden sm:mt-1.5 sm:block sm:text-xs sm:leading-5 sm:text-slate-500">
        Satın alma, sipariş ve cari hesap özetleri.
      </p>
    </Link>
  )}

  <Link
    href="/products"
    className="group flex min-w-0 flex-1 flex-col items-center rounded-xl border border-slate-200 border-t-4 border-t-orange-500 bg-white px-1.5 py-2 text-center text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md sm:block sm:p-3.5 sm:text-left"
  >
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-sm sm:h-9 sm:w-9 sm:text-xl">
      📦
    </div>

    <h3 className="mt-1 text-[9px] font-black leading-3 text-orange-700 sm:mt-3 sm:text-sm sm:leading-normal">
      Ürünler
    </h3>

    <p className="hidden sm:mt-1.5 sm:block sm:text-xs sm:leading-5 sm:text-slate-500">
      Kataloğu, fiyatları ve stokları inceleyin.
    </p>
  </Link>

  <Link
    href="/cart"
    className="group flex min-w-0 flex-1 flex-col items-center rounded-xl border border-slate-200 border-t-4 border-t-emerald-600 bg-white px-1.5 py-2 text-center text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md sm:block sm:p-3.5 sm:text-left"
  >
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-sm sm:h-9 sm:w-9 sm:text-xl">
      🛒
    </div>

    <h3 className="mt-1 text-[9px] font-black leading-3 text-emerald-800 sm:mt-3 sm:text-sm sm:leading-normal">
      Sepetim
    </h3>

    <p className="hidden sm:mt-1.5 sm:block sm:text-xs sm:leading-5 sm:text-slate-500">
      Sepetinizi kontrol edin ve tamamlayın.
    </p>
  </Link>

  <Link
    href="/account/orders"
    className="group flex min-w-0 flex-1 flex-col items-center rounded-xl border border-slate-200 border-t-4 border-t-blue-700 bg-white px-1.5 py-2 text-center text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md sm:block sm:p-3.5 sm:text-left"
  >
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-sm sm:h-9 sm:w-9 sm:text-xl">
      📋
    </div>

    <h3 className="mt-1 text-[8px] font-black leading-3 text-blue-800 sm:mt-3 sm:text-sm sm:leading-normal">
      Siparişlerim
    </h3>

    <p className="hidden sm:mt-1.5 sm:block sm:text-xs sm:leading-5 sm:text-slate-500">
      Siparişlerinizi ve durumlarını görüntüleyin.
    </p>
  </Link>

  <Link
    href="/change-password?returnTo=%2Faccount"
    className="group flex min-w-0 flex-1 flex-col items-center rounded-xl border border-slate-200 border-t-4 border-t-violet-600 bg-white px-1.5 py-2 text-center text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md sm:block sm:p-3.5 sm:text-left"
  >
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-sm sm:h-9 sm:w-9 sm:text-xl">
      🔐
    </div>

    <h3 className="mt-1 text-[9px] font-black leading-3 text-violet-800 sm:mt-3 sm:text-sm sm:leading-normal">
      Şifrem
    </h3>

    <p className="hidden sm:mt-1.5 sm:block sm:text-xs sm:leading-5 sm:text-slate-500">
      Mevcut şifrenizi güvenle değiştirin.
    </p>
  </Link>
</div>
</section>

        {opportunityProduct && (
          <section className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 p-1 shadow-lg">
            <div className="grid gap-3 rounded-xl bg-slate-950 px-4 py-3 text-white md:grid-cols-[90px_1fr_auto] md:items-center lg:px-5 lg:py-4">
              <Link
                href={
                  "/products/" +
                  opportunityProduct.code
                }
                className="hidden h-[82px] w-[82px] items-center justify-center rounded-lg bg-white md:flex"
              >
                <ProductImage
                  imageUrl={
                    opportunityProduct.imageUrl
                  }
                  productName={
                    opportunityProduct.name
                  }
                  className="h-full w-full object-contain p-1.5"
                  fallbackClassName="hidden"
                />
              </Link>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
                  Fırsatı Yakala
                </p>

                <h2 className="mt-2 text-base font-black lg:text-lg">
                  {
                    opportunityProduct.name
                  }
                </h2>

                <p className="mt-1 text-sm text-slate-300">
                  {
                    opportunityProduct.brand
                  }
                  {" · "}
                  {
                    opportunityProduct.category
                  }
                  {" · Stok: "}
                  {getAvailableStock(
                    opportunityProduct.stock,
                    opportunityProduct.reservedStock,
                  )}{" "}
                  adet
                </p>

                {customer.discountRate >
                0 ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-slate-400 line-through">
                      {formatCurrency(
                        opportunityProduct.price,
                      )}
                    </span>

                    <span className="text-xl font-black text-amber-300">
                      {formatCurrency(
                        opportunityPrice,
                      )}
                    </span>

                    <span className="rounded-full bg-amber-300 px-3 py-1 text-sm font-black text-slate-950">
                      Size özel %
                      {customer.discountRate.toLocaleString(
                        "tr-TR",
                      )}{" "}
                      iskonto
                    </span>
                  </div>
                ) : (
                  <p className="mt-5 text-2xl font-black text-amber-300">
                    {formatCurrency(
                      opportunityProduct.price,
                    )}
                  </p>
                )}
              </div>

              <Link
                href={
                  "/products/" +
                  opportunityProduct.code
                }
                className="inline-flex min-w-32 items-center justify-center rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-300"
              >
                Ürünü İncele
              </Link>
            </div>
          </section>
        )}

        <section className="mt-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#EF4B23]">
                Katalog Vitrini
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-900">
                Yeni Eklenenler
              </h2>
            </div>

            <Link
              href="/products"
              className="font-bold text-[#202B38] hover:underline"
            >
              Tüm Ürünleri Gör
            </Link>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {newProducts.map(
              (
                product,
              ) => (
                <Link
                  key={
                    product.id
                  }
                  href={
                    "/products/" +
                    product.code
                  }
                  className="group rounded-xl border border-slate-200 bg-white p-3 shadow transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <ProductImage
                    imageUrl={
                      product.imageUrl
                    }
                    productName={
                      product.name
                    }
                    className="h-32 w-full rounded-lg bg-white object-contain p-2 sm:h-36"
                    fallbackClassName="hidden"
                  />

                  <span className="mt-3 inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-[#D83D18]">
                    Yeni
                  </span>

                  <h3 className="mt-2 line-clamp-2 min-h-10 text-sm font-black text-slate-900 group-hover:text-[#D83D18]">
                    {
                      product.name
                    }
                  </h3>

                  <p className="mt-2 truncate text-sm text-slate-500">
                    {
                      product.brand
                    }
                    {" · "}
                    {
                      product.code
                    }
                  </p>

                  <p className="mt-3 text-base font-black text-[#202B38]">
                    {formatCurrency(
                      calculateDiscountedPrice(
                        product.price,
                        customer.discountRate,
                      ),
                    )}
                  </p>

{getAvailableStock(
  product.stock,
  product.reservedStock,
) > 0 ? (
  <p className="mt-1 text-sm font-semibold text-green-700">
    Stok:{" "}
    {getAvailableStock(
      product.stock,
      product.reservedStock,
    )}{" "}
    adet
  </p>
) : (
  <p className="mt-1 text-sm font-black text-amber-700">
    Yakında Stokta
  </p>
)}
                </Link>
              ),
            )}

            {newProducts.length ===
              0 && (
              <p className="col-span-full rounded-2xl bg-white p-8 text-center text-slate-500 shadow">
                Görseli ve stoğu bulunan yeni ürün bulunmuyor.
              </p>
            )}
          </div>
        </section>

        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-rose-700">
                Satın Alma Geçmişinize Göre
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-900">
                Favori Ürünlerin
              </h2>
            </div>

            <Link
              href="/account/orders"
              className="font-bold text-[#202B38] hover:underline"
            >
              Sipariş Geçmişine Git
            </Link>
          </div>

          {favoriteProducts.length >
          0 ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {favoriteProducts.map(
                (
                  product,
                  index,
                ) => (
                  <Link
                    key={
                      product.id
                    }
                    href={
                      "/products/" +
                      product.code
                    }
                    className="flex gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-rose-300 hover:bg-rose-50"
                  >
                    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-white">
                      <ProductImage
                        imageUrl={
                          product.imageUrl
                        }
                        productName={
                          product.name
                        }
                        className="h-full w-full object-contain p-1"
                        fallbackClassName="hidden"
                      />

                      <span className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[10px] font-black text-rose-700 shadow-sm">
                        {
                          index +
                          1
                        }
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h3 className="line-clamp-2 font-black text-slate-900">
                        {
                          product.name
                        }
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Daha önce{" "}
                        {
                          product.purchasedQuantity
                        }{" "}
                        adet alındı
                      </p>

                      <p className="mt-2 font-black text-[#202B38]">
                        {formatCurrency(
                          calculateDiscountedPrice(
                            product.price,
                            customer.discountRate,
                          ),
                        )}
                      </p>

                      <p className="mt-1 text-xs font-bold text-green-700">
                        Stokta
                      </p>
                    </div>
                  </Link>
                ),
              )}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="font-bold text-slate-700">
                Favori ürün listeniz sipariş verdikçe otomatik oluşacak.
              </p>

              <p className="mt-2 text-sm text-slate-500">
                En sık satın aldığınız ürünleri burada hızlıca bulabileceksiniz.
              </p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
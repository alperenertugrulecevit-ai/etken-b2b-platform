import {
  CustomerUserRole,
  OrderStatus,
  UserType,
} from "@prisma/client";
import Link from "next/link";

import Header from "@/components/layout/Header";

// B2B_ACCOUNT_COMPACT_UI_V1
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { SessionService } from "@/modules/auth/services/session.service";

import { customerLogoutAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Kurumsal Hesabım | ETKEN Ofis",
};

function formatCurrency(value: number) {
  return value.toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function calculateDiscountedPrice(
  price: number,
  discountRate: number
) {
  return Math.round(
    (price * (1 - discountRate / 100) + Number.EPSILON) *
      100
  ) / 100;
}

export default async function AccountPage() {
  const user = await SessionService.getCurrentUser();

  if (
    !user ||
    user.userType !== UserType.CUSTOMER ||
    !user.customer ||
    !user.customer.isActive ||
    !user.customerId
  ) {
    redirect("/customer-login");
  }

  const customerId = user.customerId;
  const canViewDashboard =
    user.customerRole === CustomerUserRole.CUSTOMER_ADMIN;
  const displayName = user.fullName?.trim() || user.username;

  const [customer, newProducts, favoriteGroups, opportunityProduct] =
    await Promise.all([
      prisma.customer.findUnique({
        where: { id: customerId },
        select: {
          companyName: true,
          customerCode: true,
          discountRate: true,
        },
      }),
      prisma.product.findMany({
        where: {
          isActive: true,
          stock: { gt: 0 },
        },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
          id: true,
          code: true,
          name: true,
          brand: true,
          category: true,
          price: true,
          stock: true,
        },
      }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: {
          order: {
            customerId,
            status: { not: OrderStatus.CANCELLED },
          },
        },
        _sum: { quantity: true },
        orderBy: {
          _sum: { quantity: "desc" },
        },
        take: 4,
      }),
      prisma.product.findFirst({
        where: {
          isActive: true,
          stock: { gt: 0 },
          ownStock: true,
        },
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
        select: {
          id: true,
          code: true,
          name: true,
          brand: true,
          category: true,
          price: true,
          stock: true,
        },
      }),
    ]);

  if (!customer) {
    redirect("/customer-login");
  }

  const favoriteProductIds = favoriteGroups.map(
    (group) => group.productId
  );
  const favoriteProductRows =
    favoriteProductIds.length > 0
      ? await prisma.product.findMany({
          where: {
            id: { in: favoriteProductIds },
            isActive: true,
          },
          select: {
            id: true,
            code: true,
            name: true,
            brand: true,
            category: true,
            price: true,
            stock: true,
          },
        })
      : [];
  const favoriteProductMap = new Map(
    favoriteProductRows.map((product) => [product.id, product])
  );
  const favoriteProducts = favoriteGroups
    .map((group) => {
      const product = favoriteProductMap.get(group.productId);

      return product
        ? {
            ...product,
            purchasedQuantity: group._sum.quantity ?? 0,
          }
        : null;
    })
    .filter(
      (product): product is NonNullable<typeof product> =>
        product !== null
    );
  const opportunityPrice = opportunityProduct
    ? calculateDiscountedPrice(
        opportunityProduct.price,
        customer.discountRate
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
            {customer.companyName}
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            Kullanıcı: {displayName}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Müşteri kodu: {customer.customerCode}
          </p>
        </div>

        <form action={customerLogoutAction}>
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

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {canViewDashboard && (

            <Link href="/account/dashboard" className="group rounded-xl border border-slate-200 border-t-4 border-t-cyan-600 bg-white p-3.5 text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-xl">📊</div>
            <h3 className="mt-3 text-sm font-black text-cyan-800">Dashboard</h3>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">Satın alma, sipariş ve cari hesap özetleri.</p>
          </Link>

          )}
          <Link href="/products" className="group rounded-xl border border-slate-200 border-t-4 border-t-orange-500 bg-white p-3.5 text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-xl">📦</div>
            <h3 className="mt-3 text-sm font-black text-orange-700">Ürünler</h3>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">Kataloğu, fiyatları ve stokları inceleyin.</p>
          </Link>
          <Link href="/cart" className="group rounded-xl border border-slate-200 border-t-4 border-t-emerald-600 bg-white p-3.5 text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-xl">🛒</div>
            <h3 className="mt-3 text-sm font-black text-emerald-800">Sepetim</h3>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">Sepetinizi kontrol edin ve tamamlayın.</p>
          </Link>
          <Link href="/account/orders" className="group rounded-xl border border-slate-200 border-t-4 border-t-blue-700 bg-white p-3.5 text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-xl">📋</div>
            <h3 className="mt-3 text-sm font-black text-blue-800">Siparişlerim</h3>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">Siparişlerinizi ve durumlarını görüntüleyin.</p>
          </Link>
          <Link href="/change-password?returnTo=%2Faccount" className="group rounded-xl border border-slate-200 border-t-4 border-t-violet-600 bg-white p-3.5 text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-xl">🔐</div>
            <h3 className="mt-3 text-sm font-black text-violet-800">Şifrem</h3>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">Mevcut şifrenizi güvenle değiştirin.</p>
          </Link>
        </div>
      </section>

      {opportunityProduct && (
        <section className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 p-1 shadow-lg">
          <div className="grid gap-3 rounded-xl bg-slate-950 px-4 py-3 text-white md:grid-cols-[1fr_auto] md:items-center lg:px-5 lg:py-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
                Fırsatı Yakala
              </p>
              <h2 className="mt-2 text-base font-black lg:text-lg">
                {opportunityProduct.name}
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                {opportunityProduct.brand} · {opportunityProduct.category} · Stok: {opportunityProduct.stock} adet
              </p>
              {customer.discountRate > 0 ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-400 line-through">{formatCurrency(opportunityProduct.price)}</span>
                  <span className="text-xl font-black text-amber-300">{formatCurrency(opportunityPrice)}</span>
                  <span className="rounded-full bg-amber-300 px-3 py-1 text-sm font-black text-slate-950">Size özel %{customer.discountRate.toLocaleString("tr-TR")} iskonto</span>
                </div>
              ) : (
                <p className="mt-5 text-2xl font-black text-amber-300">{formatCurrency(opportunityProduct.price)}</p>
              )}
            </div>
            <Link href={"/products/" + opportunityProduct.code} className="inline-flex min-w-32 items-center justify-center rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-300">
              Ürünü İncele
            </Link>
          </div>
        </section>
      )}

      <section className="mt-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#EF4B23]">Katalog Vitrini</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">Yeni Eklenenler</h2>
          </div>
          <Link href="/products" className="font-bold text-[#202B38] hover:underline">Tüm Ürünleri Gör</Link>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {newProducts.map((product) => (
            <Link key={product.id} href={"/products/" + product.code} className="group rounded-xl border border-slate-200 bg-white p-3 shadow transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex h-24 items-center justify-center rounded-lg bg-slate-100 text-4xl">📦</div>
              <span className="mt-3 inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-[#D83D18]">Yeni</span>
              <h3 className="mt-2 min-h-10 text-sm font-black text-slate-900 group-hover:text-[#D83D18]">{product.name}</h3>
              <p className="mt-2 text-sm text-slate-500">{product.brand} · {product.code}</p>
              <p className="mt-3 text-base font-black text-[#202B38]">{formatCurrency(calculateDiscountedPrice(product.price, customer.discountRate))}</p>
              <p className="mt-1 text-sm font-semibold text-green-700">Stok: {product.stock} adet</p>
            </Link>
          ))}
          {newProducts.length === 0 && <p className="col-span-full rounded-2xl bg-white p-8 text-center text-slate-500 shadow">Yeni ürün bulunmuyor.</p>}
        </div>
      </section>

      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-rose-700">Satın Alma Geçmişinize Göre</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">Favori Ürünlerin</h2>
          </div>
          <Link href="/account/orders" className="font-bold text-[#202B38] hover:underline">Sipariş Geçmişine Git</Link>
        </div>
        {favoriteProducts.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {favoriteProducts.map((product, index) => (
              <Link key={product.id} href={"/products/" + product.code} className="flex gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-rose-300 hover:bg-rose-50">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-lg font-black text-rose-700">{index + 1}</div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-900">{product.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">Daha önce {product.purchasedQuantity} adet alındı</p>
                  <p className="mt-2 font-black text-[#202B38]">{formatCurrency(calculateDiscountedPrice(product.price, customer.discountRate))}</p>
                  <p className={"mt-1 text-xs font-bold " + (product.stock > 0 ? "text-green-700" : "text-red-700")}>{product.stock > 0 ? "Stokta" : "Stok bekleniyor"}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="font-bold text-slate-700">Favori ürün listeniz sipariş verdikçe otomatik oluşacak.</p>
            <p className="mt-2 text-sm text-slate-500">En sık satın aldığınız ürünleri burada hızlıca bulabileceksiniz.</p>
          </div>
        )}
      </section>
      </main>
    </>
  );
}

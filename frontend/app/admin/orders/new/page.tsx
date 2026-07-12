import Link from "next/link";

import { prisma } from "@/lib/prisma";
import OrderForm from "@/components/admin/OrderForm";
import { createOrder } from "../actions";

export default async function NewOrderPage() {
  const [customers, products] = await Promise.all([
    prisma.customer.findMany({
      where: {
        isActive: true,
      },

      orderBy: {
        companyName: "asc",
      },

      select: {
        id: true,
        customerCode: true,
        companyName: true,
        paymentTermDays: true,
        discountRate: true,

        addresses: {
          where: {
            isActive: true,
          },

          orderBy: [
            {
              isDefault: "desc",
            },

            {
              title: "asc",
            },
          ],

          select: {
            id: true,
            customerId: true,
            title: true,
            city: true,
            district: true,
            isDefault: true,
          },
        },
      },
    }),

    prisma.product.findMany({
      where: {
        isActive: true,
        stock: {
          gt: 0,
        },
      },

      orderBy: {
        name: "asc",
      },

      select: {
        id: true,
        code: true,
        name: true,
        price: true,
        vat: true,
        stock: true,
      },
    }),
  ]);

  return (
    <section className="p-10">
      <div className="flex items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Yeni Sipariş
          </h1>

          <p className="mt-2 text-gray-500">
            Müşteri, teslimat adresi ve ürünleri seçerek
            yeni sipariş oluşturun.
          </p>
        </div>

        <Link
          href="/admin/orders"
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
        >
          ← Sipariş Listesine Dön
        </Link>
      </div>

      {customers.length === 0 && (
        <div className="mt-8 rounded-xl bg-orange-100 p-5 text-orange-800">
          Aktif müşteri bulunamadı. Önce müşteri yönetiminden
          aktif bir müşteri oluşturun.
        </div>
      )}

      {products.length === 0 && (
        <div className="mt-4 rounded-xl bg-orange-100 p-5 text-orange-800">
          Stokta bulunan aktif ürün yok. Önce ürün ve stok
          bilgilerini kontrol edin.
        </div>
      )}

      <OrderForm
        customers={customers}
        products={products}
        action={createOrder}
      />
    </section>
  );
}
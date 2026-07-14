import Link from "next/link";

import { prisma } from "@/lib/prisma";
import PurchaseOrderCreateForm from "@/components/admin/PurchaseOrderCreateForm";

export default async function NewPurchaseOrderPage() {
  const suppliers =
    await prisma.supplier.findMany({
      where: {
        isActive: true,
      },

      orderBy: {
        name: "asc",
      },

      select: {
        id: true,
        name: true,
        paymentTermDays: true,
        discountRate: true,
        deliveryDays: true,
      },
    });

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Yeni Satın Alma
          </h1>

          <p className="mt-2 text-gray-500">
            Tedarikçiye verilecek yeni satın
            alma siparişinin üst bilgilerini
            oluşturun.
          </p>
        </div>

        <Link
          href="/admin/purchase-orders"
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
        >
          ← Satın Alma Listesine Dön
        </Link>
      </div>

      {suppliers.length === 0 && (
        <div className="mt-8 rounded-xl border border-orange-200 bg-orange-50 p-5 text-orange-800">
          Aktif tedarikçi bulunamadı.
          Satın alma oluşturabilmek için
          önce Tedarikçi Yönetimi ekranından
          aktif bir tedarikçi oluşturun.
        </div>
      )}

      <div className="mx-auto max-w-5xl">
        <PurchaseOrderCreateForm
          suppliers={suppliers}
        />
      </div>
    </section>
  );
}
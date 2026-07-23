import Link from "next/link";

import { prisma } from "@/lib/prisma";

import RFCountingForm from "@/components/rf/RFCountingForm";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export const metadata = {
  title:
    "RF Cycle Count | ETKEN WMS",

  description:
    "Depo lokasyonlarında THM bazlı anlık stok kontrolü ve düzeltmesi",
};

export default async function RFCountingPage() {
  const profile =
    await AuthorizationService.requireRfAccess(
      "COUNT_EXECUTE"
    );

  const warehouses =
    await prisma.warehouse.findMany({
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
    });

  const operatorName =
    profile.employee
      ? `${profile.employee.firstName} ${profile.employee.lastName}`
      : profile.username;

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-700">
            RF Cycle Count
          </p>

          <h1 className="mt-1 text-2xl font-black text-slate-950">
            THM Bazlı Anlık Stok
            Kontrolü
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Aktif depoyu seçin;
            lokasyon, koli veya palet
            ve ürün barkodlarını
            okutarak anlık stok
            kontrolü gerçekleştirin.
          </p>
        </div>

        <Link
          href="/rf"
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          ← RF Menü
        </Link>
      </div>

      <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
          Cycle Count Operatörü
        </p>

        <p className="mt-1 font-black text-blue-950">
          {operatorName}
        </p>

        <p className="mt-1 text-xs text-blue-700">
          @{profile.username}

          {profile.employee
            ?.employeeCode
            ? ` · ${profile.employee.employeeCode}`
            : ""}
        </p>
      </div>

      <div className="mb-5 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-violet-950">
        <p className="font-black">
          İşlem Sırası
        </p>

        <p className="mt-2 text-sm leading-6">
          Depo seçimi → Lokasyon →
          THM → Ürün → Fiziksel
          Miktar
        </p>
      </div>

      {warehouses.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h2 className="font-black">
            Aktif depo bulunamadı
          </h2>

          <p className="mt-2 text-sm leading-6">
            Cycle Count işlemi için
            yönetim panelinden en az
            bir aktif depo
            oluşturulmalıdır.
          </p>
        </div>
      ) : (
        <RFCountingForm
          warehouses={warehouses}
        />
      )}
    </section>
  );
}
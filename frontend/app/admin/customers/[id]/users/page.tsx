import Link from "next/link";
import {
  notFound,
} from "next/navigation";

import {
  UserStatus,
  UserType,
} from "@prisma/client";

import CustomerUserCreateForm from "@/components/admin/CustomerUserCreateForm";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

import {
  toggleCustomerUserStatusAction,
} from "./actions";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CustomerUsersPage({
  params,
}: Props) {
  await AuthorizationService.requirePermission(
    "CUSTOMER_MANAGE"
  );

  const { id } = await params;
  const customerId = Number(id);

  if (
    !Number.isInteger(customerId) ||
    customerId <= 0
  ) {
    notFound();
  }

  const customer =
    await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
      include: {
        users: {
          where: {
            userType:
              UserType.CUSTOMER,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

  if (!customer) {
    notFound();
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
            B2B Müşteri Hesapları
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">
            {customer.companyName}
          </h1>
          <p className="mt-2 text-slate-500">
            {customer.customerCode}
          </p>
        </div>
        <Link
          href={
            "/admin/customers/" +
            customer.id +
            "/edit"
          }
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50"
        >
          Müşteriye Dön
        </Link>
      </div>

      <CustomerUserCreateForm
        customerId={customer.id}
      />

      <section className="overflow-hidden rounded-2xl bg-white shadow">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900">
            Tanımlı Kullanıcılar
          </h2>
        </div>

        {customer.users.length === 0 ? (
          <p className="p-6 text-slate-500">
            Bu müşteri için henüz kurumsal kullanıcı oluşturulmadı.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-5 py-3">
                    Kullanıcı
                  </th>
                  <th className="px-5 py-3">
                    E-posta
                  </th>
                  <th className="px-5 py-3">
                    Durum
                  </th>
                  <th className="px-5 py-3">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody>
                {customer.users.map(
                  (user) => (
                    <tr
                      key={user.id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {user.username}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {user.email ?? "-"}
                      </td>
                      <td className="px-5 py-4">
                        {user.status ===
                        UserStatus.ACTIVE
                          ? "Aktif"
                          : "Pasif"}
                      </td>
                      <td className="px-5 py-4">
                        <form
                          action={toggleCustomerUserStatusAction.bind(
                            null,
                            customer.id,
                            user.id,
                            user.status
                          )}
                        >
                          <button
                            type="submit"
                            className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700"
                          >
                            {user.status ===
                            UserStatus.ACTIVE
                              ? "Pasife Al"
                              : "Aktifleştir"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

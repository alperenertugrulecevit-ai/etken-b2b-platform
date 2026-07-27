import { prisma } from "@/lib/prisma";

import WmsStructureManager from "@/components/admin/WmsStructureManager";

import {
  toggleLogisticsCenterStatusAction,
  toggleWmsCompanyStatusAction,
} from "./actions";

export default async function WmsStructurePage() {
  const tenant = await prisma.wmsTenant.findUnique({
    where: { code: "ETKEN" },
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  if (!tenant) {
    return (
      <section className="p-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          ETKEN WMS işletmesi bulunamadı. 3PL temel migration kaydını kontrol edin.
        </div>
      </section>
    );
  }

  const [companies, centers, warehouses, users, companyAccesses] =
    await Promise.all([
      prisma.wmsCompany.findMany({
        where: { tenantId: tenant.id },
        orderBy: [{ isActive: "desc" }, { code: "asc" }],
        include: {
          _count: {
            select: {
              warehouses: true,
              userAccesses: true,
            },
          },
        },
      }),
      prisma.logisticsCenter.findMany({
        where: { tenantId: tenant.id },
        orderBy: [{ isActive: "desc" }, { code: "asc" }],
        include: {
          _count: {
            select: { warehouses: true },
          },
        },
      }),
      prisma.warehouse.findMany({
        where: { tenantId: tenant.id },
        orderBy: { code: "asc" },
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
          companyId: true,
          logisticsCenterId: true,
          company: {
            select: { code: true, name: true },
          },
          logisticsCenter: {
            select: { code: true, name: true },
          },
        },
      }),
      prisma.user.findMany({
        orderBy: { username: "asc" },
        select: {
          id: true,
          username: true,
          status: true,
          employee: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.userCompanyAccess.findMany({
        where: {
          tenantId: tenant.id,
          isActive: true,
        },
        orderBy: [
          { company: { code: "asc" } },
          { user: { username: "asc" } },
        ],
        select: {
          id: true,
          userId: true,
          companyId: true,
          canManage: true,
          isDefault: true,
          user: {
            select: {
              username: true,
              employee: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
              wmsWarehouseAccesses: {
                where: {
                  isActive: true,
                },
                select: {
                  warehouse: {
                    select: {
                      companyId: true,
                    },
                  },
                },
              },
            },
          },
          company: {
            select: { code: true, name: true },
          },
        },
      }),
    ]);

  const activeCompanyCount = companies.filter((item) => item.isActive).length;
  const activeCenterCount = centers.filter((item) => item.isActive).length;
  const activeWarehouseCount = warehouses.filter((item) => item.isActive).length;

  return (
    <section className="p-10">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
          3PL Yapılandırma
        </p>
        <h1 className="mt-2 text-4xl font-bold">Şirket ve Lojistik Yapısı</h1>
        <p className="mt-2 max-w-4xl text-gray-500">
          Stok sahibi şirketleri, fiziksel lojistik merkezlerini, şirket depolarını
          ve kullanıcı erişimlerini tek merkezden yönetin.
        </p>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-4">
        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">WMS İşletmesi</p>
          <p className="mt-3 text-2xl font-black text-blue-950">{tenant.code}</p>
          <p className="mt-1 text-sm text-gray-500">{tenant.name}</p>
        </article>
        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">Aktif Şirket</p>
          <p className="mt-3 text-4xl font-black text-blue-900">{activeCompanyCount}</p>
        </article>
        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">Lojistik Merkezi</p>
          <p className="mt-3 text-4xl font-black text-violet-700">{activeCenterCount}</p>
        </article>
        <article className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-gray-500">Aktif Depo</p>
          <p className="mt-3 text-4xl font-black text-green-700">{activeWarehouseCount}</p>
        </article>
      </div>

      <WmsStructureManager
        companies={companies.map((company) => ({
          id: company.id,
          code: company.code,
          name: company.name,
          isActive: company.isActive,
        }))}
        centers={centers.map((center) => ({
          id: center.id,
          code: center.code,
          name: center.name,
          isActive: center.isActive,
        }))}
        warehouses={warehouses.map((warehouse) => ({
          id: warehouse.id,
          code: warehouse.code,
          name: warehouse.name,
          companyId: warehouse.companyId,
          logisticsCenterId: warehouse.logisticsCenterId,
        }))}
        users={users.map((user) => ({
          id: user.id,
          username: user.username,
          name: user.employee
            ? (user.employee.firstName + " " + user.employee.lastName).trim()
            : user.username,
          status: user.status,
        }))}
      />

      <div className="mt-10 grid gap-8 xl:grid-cols-2">
        <div className="overflow-x-auto rounded-2xl bg-white shadow">
          <div className="border-b p-6">
            <h2 className="text-2xl font-black">Stok Sahibi Şirketler</h2>
          </div>
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="p-4">Kod</th>
                <th className="p-4">Şirket</th>
                <th className="p-4">Depo</th>
                <th className="p-4">Kullanıcı</th>
                <th className="p-4">Durum</th>
                <th className="p-4">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id} className="border-b">
                  <td className="p-4 font-bold text-blue-900">{company.code}</td>
                  <td className="p-4">
                    <p className="font-bold">{company.name}</p>
                    <p className="text-sm text-gray-500">{company.legalName || "-"}</p>
                  </td>
                  <td className="p-4 font-bold">{company._count.warehouses}</td>
                  <td className="p-4 font-bold">{company._count.userAccesses}</td>
                  <td className="p-4">
                    <span
                      className={
                        "rounded-full px-3 py-1 text-sm font-bold " +
                        (
                          company.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        )
                      }
                    >
                      {company.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="p-4">
                    <form
                      action={toggleWmsCompanyStatusAction.bind(
                        null,
                        company.id,
                        company.isActive,
                      )}
                    >
                      <button
                        type="submit"
                        className={
                          "rounded-lg px-4 py-2 font-bold text-white " +
                          (
                            company.isActive
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-green-600 hover:bg-green-700"
                          )
                        }
                      >
                        {company.isActive ? "Pasif Yap" : "Aktifleştir"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto rounded-2xl bg-white shadow">
          <div className="border-b p-6">
            <h2 className="text-2xl font-black">Lojistik Merkezleri</h2>
          </div>
          <table className="w-full min-w-[650px] text-left">
            <thead className="bg-violet-800 text-white">
              <tr>
                <th className="p-4">Kod</th>
                <th className="p-4">Merkez</th>
                <th className="p-4">Depo</th>
                <th className="p-4">Durum</th>
                <th className="p-4">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {centers.map((center) => (
                <tr key={center.id} className="border-b">
                  <td className="p-4 font-bold text-violet-800">{center.code}</td>
                  <td className="p-4">
                    <p className="font-bold">{center.name}</p>
                    <p className="text-sm text-gray-500">
                      {[center.district, center.city].filter(Boolean).join(" / ") || "-"}
                    </p>
                  </td>
                  <td className="p-4 font-bold">{center._count.warehouses}</td>
                  <td className="p-4">
                    <span
                      className={
                        "rounded-full px-3 py-1 text-sm font-bold " +
                        (
                          center.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        )
                      }
                    >
                      {center.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="p-4">
                    <form
                      action={toggleLogisticsCenterStatusAction.bind(
                        null,
                        center.id,
                        center.isActive,
                      )}
                    >
                      <button
                        type="submit"
                        className={
                          "rounded-lg px-4 py-2 font-bold text-white " +
                          (
                            center.isActive
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-green-600 hover:bg-green-700"
                          )
                        }
                      >
                        {center.isActive ? "Pasif Yap" : "Aktifleştir"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-10 overflow-x-auto rounded-2xl bg-white shadow">
        <div className="border-b p-6">
          <h2 className="text-2xl font-black">Depo Bağlantıları</h2>
        </div>
        <table className="w-full min-w-[850px] text-left">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-4">Depo</th>
              <th className="p-4">Stok Sahibi Şirket</th>
              <th className="p-4">Lojistik Merkezi</th>
              <th className="p-4">Durum</th>
            </tr>
          </thead>
          <tbody>
            {warehouses.map((warehouse) => (
              <tr key={warehouse.id} className="border-b">
                <td className="p-4">
                  <p className="font-bold">{warehouse.code}</p>
                  <p className="text-sm text-gray-500">{warehouse.name}</p>
                </td>
                <td className="p-4">
                  <p className="font-bold">{warehouse.company.code}</p>
                  <p className="text-sm text-gray-500">{warehouse.company.name}</p>
                </td>
                <td className="p-4">
                  <p className="font-bold">{warehouse.logisticsCenter.code}</p>
                  <p className="text-sm text-gray-500">
                    {warehouse.logisticsCenter.name}
                  </p>
                </td>
                <td className="p-4">
                  {warehouse.isActive ? "Aktif" : "Pasif"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 overflow-x-auto rounded-2xl bg-white shadow">
        <div className="border-b p-6">
          <h2 className="text-2xl font-black">Kullanıcı Şirket Erişimleri</h2>
        </div>
        <table className="w-full min-w-[850px] text-left">
          <thead className="bg-cyan-900 text-white">
            <tr>
              <th className="p-4">Kullanıcı</th>
              <th className="p-4">Şirket</th>
              <th className="p-4">Depo Erişimi</th>
              <th className="p-4">Varsayılan</th>
              <th className="p-4">Yönetebilir</th>
            </tr>
          </thead>
          <tbody>
            {companyAccesses.map((access) => {
              const employeeName = access.user.employee
                ? (
                    access.user.employee.firstName +
                    " " +
                    access.user.employee.lastName
                  ).trim()
                : access.user.username;

              return (
                <tr key={access.id} className="border-b">
                  <td className="p-4">
                    <p className="font-bold">{employeeName}</p>
                    <p className="text-sm text-gray-500">@{access.user.username}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-bold">{access.company.code}</p>
                    <p className="text-sm text-gray-500">{access.company.name}</p>
                  </td>
                  <td className="p-4 font-bold">
                    {
                      access.user.wmsWarehouseAccesses.filter(
                        (warehouseAccess) =>
                          warehouseAccess.warehouse.companyId ===
                          access.companyId,
                      ).length
                    }
                  </td>
                  <td className="p-4">{access.isDefault ? "Evet" : "Hayır"}</td>
                  <td className="p-4">{access.canManage ? "Evet" : "Hayır"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

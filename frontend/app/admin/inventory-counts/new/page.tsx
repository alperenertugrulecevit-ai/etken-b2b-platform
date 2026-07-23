import Link from "next/link";

import InventoryCountCreateForm from "@/components/admin/InventoryCountCreateForm";

import type {
  InventoryCountAssigneeOption,
  InventoryCountWarehouseOption,
} from "@/components/admin/InventoryCountCreateForm";

import { prisma } from "@/lib/prisma";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export const metadata = {
  title:
    "Yeni Planlı Sayım | ETKEN WMS",

  description:
    "Depo lokasyonları için planlı sayım oluşturma ekranı",
};

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
    .join("-")
    .toUpperCase();
}

export default async function NewInventoryCountPage() {
  await AuthorizationService.requirePermission(
    "INVENTORY_COUNT_MANAGE"
  );

  const [
    warehouseRecords,
    assigneeRecords,
  ] = await Promise.all([
    prisma.warehouse.findMany({
      where: {
        isActive: true,
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

        locations: {
          where: {
            isActive: true,
          },

          orderBy: [
            {
              sortOrder:
                "asc",
            },
            {
              code: "asc",
            },
            {
              aisle: "asc",
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
            code: true,
            aisle: true,
            section: true,
            level: true,
            bin: true,
            locationType:
              true,
          },
        },
      },
    }),

    prisma.user.findMany({
      where: {
        status: "ACTIVE",

        employee: {
          is: {
            isActive: true,
          },
        },
      },

      orderBy: {
        username: "asc",
      },

      select: {
        id: true,
        username: true,

        employee: {
          select: {
            employeeCode:
              true,
            firstName:
              true,
            lastName:
              true,
            department:
              true,
            title:
              true,
          },
        },
      },
    }),
  ]);

  const warehouses:
    InventoryCountWarehouseOption[] =
    warehouseRecords.map(
      (warehouse) => ({
        id: warehouse.id,
        code: warehouse.code,
        name: warehouse.name,

        locations:
          warehouse.locations.map(
            (location) => ({
              id: location.id,
              code:
                location.code,
              aisle:
                location.aisle,
              section:
                location.section,
              level:
                location.level,
              bin:
                location.bin,

              fullCode:
                createFullLocationCode({
                  code:
                    location.code,

                  section:
                    location.section,

                  level:
                    location.level,

                  bin:
                    location.bin,
                }),

              locationType:
                location.locationType,
            })
          ),
      })
    );

  const assignees:
    InventoryCountAssigneeOption[] =
    assigneeRecords
      .filter(
        (
          user
        ): user is typeof user & {
          employee: NonNullable<
            typeof user.employee
          >;
        } =>
          user.employee !==
          null
      )
      .map((user) => ({
        userId: user.id,

        username:
          user.username,

        employeeCode:
          user.employee.employeeCode,

        fullName:
          `${user.employee.firstName} ${user.employee.lastName}`,

        department:
          user.employee.department ??
          "",

        title:
          user.employee.title ??
          "",
      }))
      .sort(
        (
          firstAssignee,
          secondAssignee
        ) =>
          firstAssignee.fullName.localeCompare(
            secondAssignee.fullName,
            "tr"
          )
      );

  const totalLocationCount =
    warehouses.reduce(
      (
        total,
        warehouse
      ) =>
        total +
        warehouse.locations.length,
      0
    );

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
              Stok Yönetimi
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              Yeni Planlı Sayım
            </h1>

            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Depoyu, sayılacak
              lokasyonları ve sayımı
              yapacak personelleri
              belirleyerek yeni bir
              sayım numarası oluşturun.
            </p>
          </div>

          <Link
            href="/admin/inventory-counts"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-100"
          >
            Sayım Listesine Dön
          </Link>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Aktif Depo
            </p>

            <p className="mt-2 text-3xl font-black text-slate-950">
              {
                warehouses.length
              }
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Aktif Lokasyon
            </p>

            <p className="mt-2 text-3xl font-black text-slate-950">
              {
                totalLocationCount
              }
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Aktif Personel
            </p>

            <p className="mt-2 text-3xl font-black text-slate-950">
              {
                assignees.length
              }
            </p>
          </div>
        </div>

        {warehouses.length ===
          0 ? (
          <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <h2 className="text-xl font-black">
              Aktif depo bulunamadı
            </h2>

            <p className="mt-2 leading-6">
              Planlı sayım
              oluşturabilmek için en
              az bir aktif depo kaydı
              bulunmalıdır.
            </p>

            <Link
              href="/admin/warehouses"
              className="mt-4 inline-flex rounded-xl bg-amber-800 px-5 py-3 font-bold text-white hover:bg-amber-700"
            >
              Depo Yönetimine Git
            </Link>
          </div>
        ) : assignees.length ===
          0 ? (
          <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <h2 className="text-xl font-black">
              Aktif personel
              bulunamadı
            </h2>

            <p className="mt-2 max-w-3xl leading-6">
              Sayıma personel
              atayabilmek için aktif
              kullanıcı hesabına bağlı
              en az bir aktif personel
              kaydı bulunmalıdır.
            </p>

            <Link
              href="/admin/users"
              className="mt-4 inline-flex rounded-xl bg-amber-800 px-5 py-3 font-bold text-white hover:bg-amber-700"
            >
              Kullanıcı Yönetimine Git
            </Link>
          </div>
        ) : (
          <div className="mt-8">
            <InventoryCountCreateForm
              warehouses={
                warehouses
              }
              assignees={
                assignees
              }
            />
          </div>
        )}
      </div>
    </main>
  );
}
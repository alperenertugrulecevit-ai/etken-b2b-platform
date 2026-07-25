import Link from "next/link";

import {
  DataImportType,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import CustomerImportUploadForm from "@/components/admin/CustomerImportUploadForm";

import ProductImportUploadForm from "@/components/admin/ProductImportUploadForm";

import PurchaseOrderImportUploadForm from "@/components/admin/PurchaseOrderImportUploadForm";

import SupplierImportUploadForm from "@/components/admin/SupplierImportUploadForm";

import {
  AuthorizationService,
} from "@/modules/authorization/services/authorization.service";

const STATUS_LABELS:
  Record<string, string> = {
  VALIDATING:
    "Doğrulanıyor",

  READY:
    "Onay Bekliyor",

  PROCESSING:
    "İşleniyor",

  COMPLETED:
    "Tamamlandı",

  PARTIAL:
    "Kısmi",

  FAILED:
    "Başarısız",

  CANCELLED:
    "İptal",
};

const TYPE_LABELS:
  Record<string, string> = {
  PRODUCT:
    "Ürün",

  SUPPLIER:
    "Tedarikçi",

  CUSTOMER:
    "Müşteri",

  PURCHASE_ORDER:
    "Satın Alma Siparişi",

  SALES_ORDER:
    "Sevk Siparişi",
};

function getTypeClassName(
  importType: string
) {
  switch (
    importType
  ) {
    case DataImportType.PRODUCT:
      return "bg-blue-100 text-blue-800";

    case DataImportType.SUPPLIER:
      return "bg-emerald-100 text-emerald-800";

    case DataImportType.CUSTOMER:
      return "bg-orange-100 text-orange-800";

    case DataImportType.PURCHASE_ORDER:
      return "bg-violet-100 text-violet-800";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getStatusClassName(
  status: string
) {
  switch (
    status
  ) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-800";

    case "READY":
      return "bg-amber-100 text-amber-800";

    case "PROCESSING":
    case "VALIDATING":
      return "bg-blue-100 text-blue-800";

    case "FAILED":
    case "PARTIAL":
      return "bg-red-100 text-red-800";

    case "CANCELLED":
      return "bg-slate-200 text-slate-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function DataImportsPage() {
  const profile =
    await AuthorizationService.requirePermission(
      "DATA_IMPORT_VIEW"
    );

  const canManage =
    AuthorizationService.hasPermission(
      profile,
      "DATA_IMPORT_MANAGE"
    );

  const jobs =
    await prisma.dataImportJob.findMany({
      where: {
        importType: {
          in: [
            DataImportType.PRODUCT,
            DataImportType.SUPPLIER,
            DataImportType.CUSTOMER,
            DataImportType.PURCHASE_ORDER,
          ],
        },
      },

      orderBy: {
        createdAt:
          "desc",
      },

      take:
        100,

      select: {
        id: true,

        importNumber:
          true,

        importType:
          true,

        mode: true,
        status: true,

        originalFileName:
          true,

        totalRows:
          true,

        validRows:
          true,

        invalidRows:
          true,

        insertedRows:
          true,

        updatedRows:
          true,

        skippedRows:
          true,

        failedRows:
          true,

        createdByName:
          true,

        createdAt:
          true,
      },
    });

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-700">
              Master Data
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              Excel Veri Aktarımı
            </h1>

            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Ürün, tedarikçi,
              müşteri ve satın alma
              siparişi kayıtlarını
              Excel şablonlarıyla
              kontrollü biçimde
              sisteme aktarın.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/products"
              className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 hover:bg-blue-100"
            >
              Ürünler
            </Link>

            <Link
              href="/admin/suppliers"
              className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
            >
              Tedarikçiler
            </Link>

            <Link
              href="/admin/customers"
              className="rounded-xl border border-orange-300 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800 hover:bg-orange-100"
            >
              Müşteriler
            </Link>

            <Link
              href="/admin/purchase-orders"
              className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-800 hover:bg-violet-100"
            >
              Satın Alma
            </Link>
          </div>
        </div>

        {canManage ? (
          <div className="mt-8 grid items-start gap-6 xl:grid-cols-2">
            <ProductImportUploadForm />

            <SupplierImportUploadForm />

            <CustomerImportUploadForm />

            <PurchaseOrderImportUploadForm />
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            Aktarım geçmişini
            görüntüleyebilirsiniz
            ancak yeni Excel aktarımı
            başlatma yetkiniz yok.
          </div>
        )}

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Son Excel Aktarımları
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Tüm master data ve
                sipariş aktarım geçmişi
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
              Son {jobs.length} kayıt
            </span>
          </div>

          {jobs.length ===
          0 ? (
            <div className="p-8 text-center text-slate-500">
              Henüz Excel aktarımı
              yapılmadı.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900 text-left text-white">
                  <tr>
                    <th className="px-4 py-3">
                      Aktarım No
                    </th>

                    <th className="px-4 py-3">
                      Tür
                    </th>

                    <th className="px-4 py-3">
                      Dosya
                    </th>

                    <th className="px-4 py-3">
                      Durum
                    </th>

                    <th className="px-4 py-3">
                      Satırlar
                    </th>

                    <th className="px-4 py-3">
                      Sonuç
                    </th>

                    <th className="px-4 py-3">
                      Kullanıcı / Tarih
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {jobs.map(
                    (job) => (
                      <tr
                        key={
                          job.id
                        }
                        className="hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-4 py-4">
                          <Link
                            href={`/admin/data-imports/${job.id}`}
                            className="font-black text-blue-800 hover:underline"
                          >
                            {
                              job.importNumber
                            }
                          </Link>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${getTypeClassName(
                              job.importType
                            )}`}
                          >
                            {
                              TYPE_LABELS[
                                job.importType
                              ] ??
                              job.importType
                            }
                          </span>
                        </td>

                        <td className="max-w-xs px-4 py-4">
                          <span className="break-all">
                            {
                              job.originalFileName
                            }
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${getStatusClassName(
                              job.status
                            )}`}
                          >
                            {
                              STATUS_LABELS[
                                job.status
                              ] ??
                              job.status
                            }
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          <div>
                            {job.totalRows}
                            {" toplam"}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {job.validRows}
                            {" geçerli · "}
                            {job.invalidRows}
                            {" hatalı"}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          <div>
                            {job.insertedRows}
                            {" yeni · "}
                            {job.updatedRows}
                            {" güncel"}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {job.skippedRows}
                            {" atlandı · "}
                            {job.failedRows}
                            {" başarısız"}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          <div className="font-semibold">
                            {
                              job.createdByName
                            }
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {
                              job.createdAt.toLocaleString(
                                "tr-TR"
                              )
                            }
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-900">
          <h2 className="font-black">
            Kontrollü Aktarım
          </h2>

          <p className="mt-2 text-sm leading-6">
            Yüklenen Excel dosyaları
            doğrudan sisteme işlenmez.
            Önce satır doğrulaması
            yapılır ve kayıtlar yalnızca
            kontrol ekranından
            onaylandıktan sonra
            oluşturulur.
          </p>
        </div>
      </div>
    </main>
  );
}
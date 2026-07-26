import Link from "next/link";

import {
  DataImportRowStatus,
  DataImportStatus,
  DataImportType,
} from "@prisma/client";

import {
  notFound,
} from "next/navigation";

import {
  prisma,
} from "@/lib/prisma";

import CustomerImportApproveForm from "@/components/admin/CustomerImportApproveForm";

import ProductImportApproveForm from "@/components/admin/ProductImportApproveForm";

import PurchaseOrderImportApproveForm from "@/components/admin/PurchaseOrderImportApproveForm";

import SalesOrderImportApproveForm from "@/components/admin/SalesOrderImportApproveForm";

import SupplierImportApproveForm from "@/components/admin/SupplierImportApproveForm";

import {
  AuthorizationService,
} from "@/modules/authorization/services/authorization.service";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const ROW_STATUS_LABELS:
  Record<string, string> = {
  VALID:
    "Geçerli",

  INVALID:
    "Hatalı",

  IMPORTED:
    "Eklendi",

  UPDATED:
    "Güncellendi",

  SKIPPED:
    "Atlandı",

  FAILED:
    "Başarısız",
};

function readObject(
  value: unknown
) {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  ) {
    return value as
      Record<
        string,
        unknown
      >;
  }

  return {};
}

function readErrors(
  value: unknown
) {
  return Array.isArray(
    value
  )
    ? value.map(
        String
      )
    : [];
}

function readText(
  value: unknown
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }

  return String(
    value
  );
}

function joinValues(
  values: unknown[]
) {
  const result =
    values
      .filter(
        (value) =>
          value !== null &&
          value !== undefined &&
          value !== ""
      )
      .map(
        String
      )
      .join(" · ");

  return result || "-";
}

function getRowDisplay({
  importType,
  data,
}: {
  importType:
    DataImportType;

  data:
    Record<
      string,
      unknown
    >;
}) {

    if (
    importType ===
    DataImportType.SALES_ORDER
  ) {
    /*
     * Sevk aktarımında
     * sipariş başlığı
     */
    if (
      "customerCode" in
      data
    ) {
      return {
        primary:
          readText(
            data.orderNumber
          ),

        secondary:
          readText(
            data.customerCode
          ),

        reference:
          readText(
            data.status
          ),

        detail:
          data.orderDate
            ? String(
                data.orderDate
              ).slice(
                0,
                10
              )
            : "-",

        extra:
          data.requestedDate
            ? `Talep edilen teslim: ${String(
                data.requestedDate
              ).slice(
                0,
                10
              )}`
            : "Talep edilen teslim tarihi yok",
      };
    }

    /*
     * Sevk siparişi
     * ürün satırı
     */
    return {
      primary:
        readText(
          data.orderNumber
        ),

      secondary:
        readText(
          data.productCode
        ),

      reference:
        data.quantity !==
          null &&
        data.quantity !==
          undefined
          ? `${String(
              data.quantity
            )} adet`
          : "-",

      detail:
        data.unitPrice !==
          null &&
        data.unitPrice !==
          undefined
          ? `${String(
              data.unitPrice
            )} TL`
          : "-",

      extra:
        data.vatRate !==
          null &&
        data.vatRate !==
          undefined
          ? `%${String(
              data.vatRate
            )} KDV`
          : "-",
    };
  }

  if (
    importType ===
    DataImportType.PURCHASE_ORDER
  ) {
    /*
     * Satın alma aktarımında
     * sipariş başlığı
     */
    if (
      "supplierName" in
      data
    ) {
      return {
        primary:
          readText(
            data.purchaseNumber
          ),

        secondary:
          readText(
            data.supplierName
          ),

        reference:
          readText(
            data.status
          ),

        detail:
          data.orderDate
            ? String(
                data.orderDate
              ).slice(
                0,
                10
              )
            : "-",

        extra:
          data.expectedDate
            ? `Beklenen teslim: ${String(
                data.expectedDate
              ).slice(
                0,
                10
              )}`
            : "Beklenen teslim tarihi yok",
      };
    }

    /*
     * Satın alma siparişi
     * ürün satırı
     */
    return {
      primary:
        readText(
          data.purchaseNumber
        ),

      secondary:
        readText(
          data.productCode
        ),

      reference:
        data.orderedQuantity !==
          null &&
        data.orderedQuantity !==
          undefined
          ? `${String(
              data.orderedQuantity
            )} adet`
          : "-",

      detail:
        data.unitPrice !==
          null &&
        data.unitPrice !==
          undefined
          ? `${String(
              data.unitPrice
            )} TL`
          : "-",

      extra:
        data.vatRate !==
          null &&
        data.vatRate !==
          undefined
          ? `%${String(
              data.vatRate
            )} KDV`
          : "-",
    };
  }

  if (
    importType ===
    DataImportType.CUSTOMER
  ) {
    /*
     * Müşteri aktarımında hem
     * müşteri hem de adres
     * satırları bulunur.
     */
    if (
      "companyName" in
      data
    ) {
      return {
        primary:
          readText(
            data.customerCode
          ),

        secondary:
          readText(
            data.companyName
          ),

        reference:
          readText(
            data.taxNumber
          ),

        detail:
          readText(
            data.contactName
          ),

        extra:
          joinValues([
            data.phone,
            data.email,
            data.district,
            data.city,
          ]),
      };
    }

    return {
      primary:
        readText(
          data.customerCode
        ),

      secondary:
        readText(
          data.title
        ),

      reference:
        readText(
          data.addressType
        ),

      detail:
        joinValues([
          data.district,
          data.city,
        ]),

      extra:
        readText(
          data.address
        ),
    };
  }

  if (
    importType ===
    DataImportType.SUPPLIER
  ) {
    return {
      primary:
        readText(
          data.name
        ),

      secondary:
        readText(
          data.contactName
        ),

      reference:
        readText(
          data.taxNumber
        ),

      detail:
        readText(
          data.phone
        ),

      extra:
        joinValues([
          data.email,
          data.district,
          data.city,
        ]),
    };
  }

  return {
    primary:
      readText(
        data.code
      ),

    secondary:
      readText(
        data.name
      ),

    reference:
      readText(
        data.barcode
      ),

    detail:
      data.price !==
        null &&
      data.price !==
        undefined
        ? `${String(
            data.price
          )} TL`
        : "-",

    extra:
      data.vat !==
        null &&
      data.vat !==
        undefined
        ? `%${String(
            data.vat
          )} KDV`
        : "-",
  };
}

function getRowStatusClassName(
  status: string
) {
  switch (status) {
    case "VALID":
    case "IMPORTED":
    case "UPDATED":
      return "bg-emerald-100 text-emerald-800";

    case "INVALID":
    case "FAILED":
      return "bg-red-100 text-red-800";

    case "SKIPPED":
      return "bg-amber-100 text-amber-800";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function DataImportDetailPage({
  params,
}: Props) {
  const profile =
    await AuthorizationService.requirePermission(
      "DATA_IMPORT_VIEW"
    );

  const {
    id,
  } = await params;

  const [
    job,
    rowCount,
  ] = await Promise.all([
    prisma.dataImportJob.findUnique({
      where: {
        id,
      },

      include: {
        rows: {
          orderBy: [
            {
              sheetName:
                "asc",
            },
            {
              rowNumber:
                "asc",
            },
          ],

          take:
            500,
        },
      },
    }),

    prisma.dataImportRow.count({
      where: {
        jobId:
          id,
      },
    }),
  ]);

  if (
    !job ||
    (
      job.importType !==
        DataImportType.PRODUCT &&
      job.importType !==
        DataImportType.SUPPLIER &&
      job.importType !==
        DataImportType.CUSTOMER &&
      job.importType !==
        DataImportType.PURCHASE_ORDER &&
      job.importType !==
        DataImportType.SALES_ORDER
    )
  ) {
    notFound();
  }

  const isProduct =
    job.importType ===
    DataImportType.PRODUCT;

  const isSupplier =
    job.importType ===
    DataImportType.SUPPLIER;

  const isCustomer =
    job.importType ===
    DataImportType.CUSTOMER;

  const isPurchaseOrder =
    job.importType ===
    DataImportType.PURCHASE_ORDER;

  const isSalesOrder =
    job.importType ===
    DataImportType.SALES_ORDER;

  const typeLabel =
    isSalesOrder
      ? "Sevk Siparişi"
      : isPurchaseOrder
        ? "Satın Alma Siparişi"
      : isCustomer
        ? "Müşteri"
        : isSupplier
          ? "Tedarikçi"
          : "Ürün";

  const resultLabel =
    isSalesOrder
      ? "sipariş/ürün"
      : isPurchaseOrder
        ? "sipariş/ürün"
      : isCustomer
        ? "müşteri/adres"
        : isSupplier
          ? "tedarikçi"
          : "ürün";

  const accentClassName =
    isSalesOrder
      ? "text-rose-700"
      : isPurchaseOrder
        ? "text-violet-700"
      : isCustomer
        ? "text-orange-700"
        : isSupplier
          ? "text-emerald-700"
          : "text-blue-700";

  const canManage =
    AuthorizationService.hasPermission(
      profile,
      "DATA_IMPORT_MANAGE"
    );

  const canApprove =
    canManage &&
    job.status ===
      DataImportStatus.READY &&
    job.invalidRows ===
      0;

  const modeLabel =
    job.mode ===
    "UPSERT"
      ? "Yeni Ekle / Güncelle"
      : "Yalnızca Yeni Kayıt";

  const summaryCards = [
    {
      label:
        "Toplam",
      value:
        job.totalRows,
      className:
        "text-slate-950",
    },
    {
      label:
        "Geçerli",
      value:
        job.validRows,
      className:
        "text-emerald-700",
    },
    {
      label:
        "Hatalı",
      value:
        job.invalidRows,
      className:
        "text-red-700",
    },
    {
      label:
        "Yeni",
      value:
        job.insertedRows,
      className:
        "text-blue-700",
    },
    {
      label:
        "Güncellenen",
      value:
        job.updatedRows,
      className:
        "text-violet-700",
    },
    {
      label:
        "Atlanan",
      value:
        job.skippedRows,
      className:
        "text-amber-700",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p
              className={`text-sm font-black uppercase tracking-[0.18em] ${accentClassName}`}
            >
              {typeLabel} Excel
              Ön İzleme
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-950">
              {
                job.importNumber
              }
            </h1>

            <p className="mt-2 text-slate-600">
              {
                job.originalFileName
              }
              {" · "}
              {
                modeLabel
              }
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Oluşturan:{" "}
              <strong>
                {
                  job.createdByName
                }
              </strong>
              {" · "}
              {
                job.createdAt.toLocaleString(
                  "tr-TR"
                )
              }
            </p>
          </div>

          <Link
            href="/admin/data-imports"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
          >
            Aktarım Listesine Dön
          </Link>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {summaryCards.map(
            (card) => (
              <div
                key={
                  card.label
                }
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-black uppercase text-slate-500">
                  {
                    card.label
                  }
                </p>

                <p
                  className={`mt-2 text-3xl font-black ${card.className}`}
                >
                  {
                    card.value
                  }
                </p>
              </div>
            )
          )}
        </div>

        {job.invalidRows >
          0 &&
        job.status ===
          DataImportStatus.READY ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
            <h2 className="font-black">
              Aktarım onaylanamaz
            </h2>

            <p className="mt-2 text-sm leading-6">
              {job.invalidRows} hatalı
              satır bulunuyor. Excel
              dosyasını düzelterek yeni
              bir ön izleme oluşturun.
            </p>
          </div>
        ) : null}

        {canApprove &&
        isProduct ? (
          <div className="mt-6">
            <ProductImportApproveForm
              jobId={
                job.id
              }
              totalRows={
                job.totalRows
              }
              modeLabel={
                modeLabel
              }
            />
          </div>
        ) : null}

        {canApprove &&
        isSupplier ? (
          <div className="mt-6">
            <SupplierImportApproveForm
              jobId={
                job.id
              }
              totalRows={
                job.totalRows
              }
              modeLabel={
                modeLabel
              }
            />
          </div>
        ) : null}

        {canApprove &&
        isCustomer ? (
          <div className="mt-6">
            <CustomerImportApproveForm
              jobId={
                job.id
              }
              totalRows={
                job.totalRows
              }
              modeLabel={
                modeLabel
              }
            />
          </div>
        ) : null}

                {canApprove &&
        isPurchaseOrder ? (
          <div className="mt-6">
            <PurchaseOrderImportApproveForm
              jobId={
                job.id
              }
              totalRows={
                job.totalRows
              }
              modeLabel={
                modeLabel
              }
            />
          </div>
        ) : null}

        {canApprove &&
        isSalesOrder ? (
          <div className="mt-6">
            <SalesOrderImportApproveForm
              jobId={
                job.id
              }
              totalRows={
                job.totalRows
              }
              modeLabel={
                modeLabel
              }
            />
          </div>
        ) : null}

        {job.status ===
        DataImportStatus.COMPLETED ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
            <h2 className="font-black">
              Aktarım tamamlandı
            </h2>

            <p className="mt-2 text-sm leading-6">
              {job.insertedRows} yeni,
              {" "}
              {job.updatedRows} güncellenen,
              {" "}
              {job.skippedRows} atlanan{" "}
              {resultLabel} satırı.
            </p>
          </div>
        ) : null}

        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Satır Sonuçları
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {typeLabel} Excel
                doğrulama sonuçları
              </p>
            </div>

            <span className="text-sm font-semibold text-slate-500">
              {rowCount > 500
                ? `İlk 500 satır gösteriliyor · Toplam ${rowCount}`
                : `${rowCount} satır`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900 text-left text-white">
                <tr>
                  <th className="px-4 py-3">
                    Sayfa / Satır
                  </th>

                  <th className="px-4 py-3">
                    Kayıt
                  </th>

                  <th className="px-4 py-3">
                    Referans
                  </th>

                  <th className="px-4 py-3">
                    Detay
                  </th>

                  <th className="px-4 py-3">
                    Durum
                  </th>

                  <th className="px-4 py-3">
                    Hata / Sonuç
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {job.rows.map(
                  (row) => {
                    const data =
                      readObject(
                        row.normalizedData
                      );

                    const errors =
                      readErrors(
                        row.errors
                      );

                    const display =
                      getRowDisplay({
                        importType:
                          job.importType,

                        data,
                      });

                    return (
                      <tr
                        key={
                          row.id
                        }
                        className={
                          row.status ===
                          DataImportRowStatus.INVALID
                            ? "bg-red-50"
                            : "hover:bg-slate-50"
                        }
                      >
                        <td className="whitespace-nowrap px-4 py-4">
                          <div className="font-bold">
                            {
                              row.sheetName
                            }
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            Satır{" "}
                            {
                              row.rowNumber
                            }
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-black text-slate-900">
                            {
                              display.primary
                            }
                          </div>

                          <div className="mt-1 text-slate-600">
                            {
                              display.secondary
                            }
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          {
                            display.reference
                          }
                        </td>

                        <td className="max-w-sm px-4 py-4">
                          <div className="font-semibold text-slate-800">
                            {
                              display.detail
                            }
                          </div>

                          <div className="mt-1 text-xs leading-5 text-slate-500">
                            {
                              display.extra
                            }
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${getRowStatusClassName(
                              row.status
                            )}`}
                          >
                            {
                              ROW_STATUS_LABELS[
                                row.status
                              ] ??
                              row.status
                            }
                          </span>
                        </td>

                        <td className="max-w-md px-4 py-4">
                          {errors.length >
                          0 ? (
                            <ul className="space-y-1 text-red-700">
                              {errors.map(
                                (
                                  error,
                                  index
                                ) => (
                                  <li
                                    key={`${index}-${error}`}
                                  >
                                    •{" "}
                                    {
                                      error
                                    }
                                  </li>
                                )
                              )}
                            </ul>
                          ) : (
                            <span className="text-emerald-700">
                              Satır uygun
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
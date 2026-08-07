import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";

import CompetitorSiteCreateForm from "@/components/admin/CompetitorSiteCreateForm";

import {
  toggleCompetitorSiteStatus,
} from "./actions";

function getSourceTypeLabel(
  sourceType:
    | "MANUAL"
    | "HTML"
    | "API"
    | "EXCEL",
): string {
  switch (sourceType) {
    case "HTML":
      return "Web Sayfası";

    case "API":
      return "API";

    case "EXCEL":
      return "Excel";

    default:
      return "Manuel";
  }
}

export default async function CompetitorSitesPage() {
  const competitorSites =
    await prisma.competitorSite.findMany({
      where: {
        tenantId:
          B2B_CONSTANTS.TENANT_ID,

        companyId:
          B2B_CONSTANTS.COMPANY_ID,
      },

      include: {
        _count: {
          select: {
            competitorProducts: true,
          },
        },
      },

      orderBy: [
        {
          isActive: "desc",
        },
        {
          name: "asc",
        },
      ],
    });

  return (
    <section className="p-10">
      <Link
        href="/admin/competitor-prices"
        className="font-bold text-blue-900 hover:underline"
      >
        ← Rakip Fiyat Analizine Dön
      </Link>

      <div className="mt-6">
        <h1 className="text-4xl font-black text-slate-900">
          Rakip Siteler
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Ofix, Avansas ve diğer izinli
          fiyat kaynaklarını tanımlayın.
          Her kaynak daha sonra Etken
          ürünleriyle eşleştirilebilir.
        </p>
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
        <CompetitorSiteCreateForm />

        <div className="overflow-hidden rounded-2xl bg-white shadow">
          <div className="border-b p-6">
            <h2 className="text-2xl font-black text-slate-900">
              Tanımlı Rakip Siteler
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Toplam{" "}
              {competitorSites.length.toLocaleString(
                "tr-TR",
              )}{" "}
              kaynak
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-4">
                    Kod
                  </th>

                  <th className="p-4">
                    Site
                  </th>

                  <th className="p-4">
                    Kaynak Tipi
                  </th>

                  <th className="p-4">
                    KDV
                  </th>

                  <th className="p-4">
                    Eşleştirme
                  </th>

                  <th className="p-4">
                    Durum
                  </th>

                  <th className="p-4">
                    İşlem
                  </th>
                </tr>
              </thead>

              <tbody>
                {competitorSites.map(
                  (site) => (
                    <tr
                      key={site.id}
                      className={`border-b align-top hover:bg-slate-50 ${
                        site.isActive
                          ? ""
                          : "opacity-60"
                      }`}
                    >
                      <td className="whitespace-nowrap p-4 font-black text-blue-900">
                        {site.code}
                      </td>

                      <td className="p-4">
                        <p className="font-bold text-slate-900">
                          {site.name}
                        </p>

                        <a
                          href={site.baseUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs font-semibold text-blue-700 hover:underline"
                        >
                          {site.baseUrl}
                        </a>

                        {site.notes && (
                          <p className="mt-2 max-w-md text-xs text-slate-500">
                            {site.notes}
                          </p>
                        )}
                      </td>

                      <td className="p-4">
                        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                          {getSourceTypeLabel(
                            site.sourceType,
                          )}
                        </span>
                      </td>

                      <td className="whitespace-nowrap p-4">
                        {site.defaultVatRate ===
                        null
                          ? "-"
                          : `%${site.defaultVatRate}`}
                      </td>

                      <td className="p-4">
                        <span className="rounded-full bg-blue-100 px-3 py-1 font-bold text-blue-700">
                          {site._count.competitorProducts.toLocaleString(
                            "tr-TR",
                          )}
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            site.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {site.isActive
                            ? "Aktif"
                            : "Pasif"}
                        </span>
                      </td>

<td className="p-4">
  <div className="flex flex-wrap gap-2">
    <Link
      href={`/admin/competitor-prices/sites/${site.id}/edit`}
      className="rounded-lg bg-blue-900 px-4 py-2 font-bold text-white hover:bg-blue-800"
    >
      Düzenle
    </Link>

    <form
      action={toggleCompetitorSiteStatus.bind(
        null,
        site.id,
        site.isActive,
      )}
    >
      <button
        type="submit"
        className={`rounded-lg px-4 py-2 font-bold text-white ${
          site.isActive
            ? "bg-red-600 hover:bg-red-700"
            : "bg-green-600 hover:bg-green-700"
        }`}
      >
        {site.isActive
          ? "Pasif Yap"
          : "Aktifleştir"}
      </button>
    </form>
  </div>
</td>

                    </tr>
                  ),
                )}

                {competitorSites.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-12 text-center text-slate-500"
                    >
                      Henüz rakip site
                      tanımlanmamış.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
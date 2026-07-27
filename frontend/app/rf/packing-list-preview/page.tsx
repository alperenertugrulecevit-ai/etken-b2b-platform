import Link from "next/link";

import RFPackingListPreview from "@/components/rf/RFPackingListPreview";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { PackingListPreviewService } from "@/modules/printing/services/packing-list-preview.service";

type RFPackingListPreviewPageProps = {
  searchParams: Promise<{
    barcode?: string;
  }>;
};

function formatDate(
  value: Date | null
) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle: "short",
      timeStyle: "short",
      timeZone:
        "Europe/Istanbul",
    }
  ).format(value);
}

function getStatusLabel(
  status: string | null
) {
  if (!status) {
    return "-";
  }

  const labels:
    Record<string, string> = {
      OPEN: "Açık",
      READY_TO_SHIP:
        "Sevke Hazır",
      SHIPPED: "Sevk Edildi",
      CANCELLED: "İptal Edildi",
      CANCELED: "İptal Edildi",
    };

  return (
    labels[status] ??
    status.replaceAll(
      "_",
      " "
    )
  );
}

export default async function RFPackingListPreviewPage({
  searchParams,
}: RFPackingListPreviewPageProps) {
  await AuthorizationService.requireRfAccess(
    "PICKING_EXECUTE"
  );

  const resolvedSearchParams =
    await searchParams;

  const barcode =
    String(
      resolvedSearchParams.barcode ??
        ""
    )
      .trim()
      .toUpperCase();

  const result = barcode
    ? await PackingListPreviewService.getByBarcode(
        barcode
      )
    : null;

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-blue-700">
            RF Operasyonu
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Çeki Listesi Ön İzleme
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Fiziksel yazıcı kullanmadan
            Sevk THM içeriğini ve 10 × 10 cm
            çeki listesi etiketlerini kontrol
            edin. Bu işlem baskı kaydı
            oluşturmaz.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/rf/packing-list-print"
            className="rounded-xl bg-blue-900 px-5 py-3 font-black text-white shadow-sm hover:bg-blue-800"
          >
            Yazdırma Ekranı
          </Link>

          <Link
            href="/rf"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-800 shadow-sm hover:bg-slate-50"
          >
            ← RF Menüsü
          </Link>
        </div>
      </div>

      <form
        method="get"
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <label className="block">
          <span className="mb-2 block text-sm font-black text-slate-800">
            Sevk THM Barkodu
          </span>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              name="barcode"
              defaultValue={barcode}
              placeholder="Sevk THM barkodunu okutun"
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={60}
              required
              autoFocus
              className="min-w-0 flex-1 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-lg font-black uppercase text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200"
            />

            <button
              type="submit"
              className="rounded-xl bg-blue-900 px-7 py-4 font-black text-white hover:bg-blue-800"
            >
              Çeki Listesini Ön İzle
            </button>

            {barcode && (
              <Link
                href="/rf/packing-list-preview"
                className="rounded-xl bg-slate-800 px-6 py-4 text-center font-black text-white hover:bg-slate-700"
              >
                Temizle
              </Link>
            )}
          </div>
        </label>

        <p className="mt-3 text-xs leading-5 text-slate-500">
          Barkod okuyucunun Enter tuşu
          göndermesi halinde sorgulama
          otomatik başlar.
        </p>
      </form>

      {!barcode && (
        <div className="mt-6 rounded-2xl border border-cyan-200 bg-cyan-50 p-6 text-cyan-950">
          <h2 className="text-xl font-black">
            Ön izleme için Sevk THM
            okutun
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6">
            Kapatılmış ve sevke hazır
            durumdaki bir Sevk THM
            barkodunu okuttuğunuzda müşteri,
            sipariş, ürün, miktar, barkod ve
            varsa E-İrsaliye QR alanları
            ekranda gösterilecektir.
          </p>
        </div>
      )}

      {result &&
        !result.success && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-6 text-red-950"
          >
            <h2 className="text-xl font-black">
              Ön izleme oluşturulamadı
            </h2>

            <p className="mt-2 text-sm leading-6">
              {result.message}
            </p>

            <p className="mt-3 text-sm font-bold">
              Okutulan Sevk THM:{" "}
              {barcode}
            </p>
          </div>
        )}

      {result &&
        result.success &&
        result.data && (
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border border-green-300 bg-green-50 p-5 text-green-950">
              <h2 className="text-xl font-black">
                Ön izleme hazır
              </h2>

              <p className="mt-2 text-sm leading-6">
                {result.message}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-black uppercase text-slate-500">
                  Sevk THM
                </p>

                <p className="mt-2 break-all font-black text-blue-950">
                  {
                    result.shippingHandlingUnitBarcode
                  }
                </p>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-black uppercase text-slate-500">
                  Durum
                </p>

                <p className="mt-2 font-black text-slate-950">
                  {getStatusLabel(
                    result.status
                  )}
                </p>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-black uppercase text-slate-500">
                  Etiket Sayısı
                </p>

                <p className="mt-2 text-2xl font-black text-blue-950">
                  {
                    result.labelCount
                  }
                </p>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-black uppercase text-slate-500">
                  Önceki Baskı
                </p>

                <p className="mt-2 text-2xl font-black text-amber-700">
                  {
                    result.previousPrintCount
                  }
                </p>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-black uppercase text-slate-500">
                  Son Baskı Tarihi
                </p>

                <p className="mt-2 font-black text-slate-950">
                  {formatDate(
                    result.packingListPrintedAt
                  )}
                </p>
              </article>
            </div>

            <RFPackingListPreview
              data={
                result.data
              }
            />
          </div>
        )}
    </section>
  );
}
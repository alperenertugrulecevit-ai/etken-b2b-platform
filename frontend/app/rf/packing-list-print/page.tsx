import Link from "next/link";

import RFPackingListPrintForm from "@/components/rf/RFPackingListPrintForm";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { confirmPackingListWithoutPrintAction } from "./actions";

export default async function RFPackingListPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ manualError?: string }>;
}) {
  const params = await searchParams;
  await AuthorizationService.requireRfAccess(
    "PICKING_EXECUTE"
  );

  const printers =
    await prisma.barcodePrinter.findMany({
      where: {
        isActive: true,
        commandLanguage: "ZPL",
      },

      orderBy: [
        {
          name: "asc",
        },
        {
          code: "asc",
        },
      ],

      select: {
        id: true,
        code: true,
        name: true,
        ipAddress: true,
        port: true,
        dpi: true,
      },
    });

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-blue-700">
            RF Operasyonu
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Çeki Listesi Baskısı
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Kapatılmış Sevk THM
            barkodlarını seri şekilde
            okutarak 100 × 100 mm termal
            çeki listelerini doğrudan ağ
            yazıcısına gönderin.
          </p>
        </div>

        <Link
          href="/rf"
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-800 shadow-sm hover:bg-slate-50"
        >
          ← RF Menüsü
        </Link>
      </div>

      <form
        action={confirmPackingListWithoutPrintAction}
        className="mt-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm"
      >
        <p className="text-xs font-black uppercase tracking-widest text-amber-700">
          Yazıcısız Test / Operasyon Onayı
        </p>
        <h2 className="mt-2 text-xl font-black text-amber-950">
          Yazdırmadan Baskıyı Onayla
        </h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          Fiziksel baskı göndermeden çeki listesini basılmış olarak işaretler.
          İşlem kullanıcı bilgisiyle hareket geçmişine kaydedilir ve THM rotalamaya açılır.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            name="shippingHandlingUnitBarcode"
            placeholder="Sevk THM barkodunu okutun"
            autoComplete="off"
            autoCapitalize="characters"
            required
            className="min-w-0 flex-1 rounded-xl border border-amber-400 bg-white p-4 text-lg font-black uppercase text-slate-950 outline-none focus:border-amber-700"
          />
          <button
            type="submit"
            className="rounded-xl bg-amber-700 px-6 py-4 font-black text-white hover:bg-amber-800"
          >
            YAZDIRMADAN BASKIYI ONAYLA
          </button>
        </div>
        {params.manualError && (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 font-bold text-red-900">
            {params.manualError}
          </div>
        )}
      </form>

      {printers.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950">
          <h2 className="text-xl font-black">
            Aktif barkod yazıcısı
            bulunamadı
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6">
            Çeki listesi basabilmek için
            önce yönetim ekranından ağ
            bağlantılı ZPL barkod yazıcısı
            tanımlanmalıdır. Yazıcı IP
            adresi, 9100 portu ve
            çözünürlük bilgisi olmadan
            baskı işlemi başlatılamaz.
          </p>

          <Link
            href="/rf"
            className="mt-5 inline-flex rounded-xl bg-blue-900 px-5 py-3 font-black text-white hover:bg-blue-800"
          >
            RF Menüsüne Dön
          </Link>
        </div>
      ) : (
        <div className="mt-6">
          <RFPackingListPrintForm
            printers={printers}
          />
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-cyan-200 bg-cyan-50 p-5 text-cyan-950">
        <h2 className="font-black">
          Seri Baskı Kullanımı
        </h2>

        <ol className="mt-3 space-y-2 text-sm leading-6">
          <li>
            1. Kullanılacak barkod
            yazıcısını seçin.
          </li>

          <li>
            2. Sevk THM barkodunu
            okutun.
          </li>

          <li>
            3. Baskı başarılı olduğunda
            alan otomatik temizlenir.
          </li>

          <li>
            4. Sıradaki Sevk THM
            barkodunu okutun.
          </li>

          <li>
            5. Daha önce basılan bir çeki
            listesinde tekrar baskı onayı
            verin.
          </li>
        </ol>
      </div>
    </section>
  );
}
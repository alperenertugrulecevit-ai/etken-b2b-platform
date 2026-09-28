import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type Props = {
  searchParams: Promise<{
    productCode?: string;
  }>;
};

export default async function SkuLabelPage({ searchParams }: Props) {
  await AuthorizationService.requirePermission("INVENTORY_VIEW");

  const query = await searchParams;
  const productCode = query.productCode?.trim().toUpperCase() ?? "";

  const product = productCode
    ? await prisma.product.findUnique({
        where: { code: productCode },
        select: {
          id: true,
          code: true,
          name: true,
          barcode: true,
          isActive: true,
        },
      })
    : null;

  return (
    <section className="p-6 lg:p-10">
      <div>
        <h1 className="text-4xl font-bold">SKU Etiketi Yazdır</h1>
        <p className="mt-2 text-gray-500">
          Ürün kodunu girerek A4 3×5 SKU etiketi oluşturun.
        </p>
      </div>

      <form className="mt-8 max-w-3xl rounded-2xl bg-white p-6 shadow">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Ürün Kodu</span>
          <input
            name="productCode"
            defaultValue={productCode}
            placeholder="Ürün kodunu yazın"
            className="w-full rounded-xl border p-4 uppercase"
            required
            autoFocus
          />
        </label>
        <button
          type="submit"
          className="mt-4 rounded-xl bg-blue-900 px-6 py-3 font-bold text-white hover:bg-blue-800"
        >
          Ürünü Getir
        </button>
      </form>

      {productCode && !product && (
        <div className="mt-6 max-w-3xl rounded-xl border border-red-200 bg-red-50 p-5 font-semibold text-red-700">
          {productCode} kodlu ürün bulunamadı.
        </div>
      )}

      {product && (
        <div className="mt-8 max-w-3xl rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase text-slate-500">Etiket Önizleme Bilgileri</p>
          <dl className="mt-4 grid gap-4 md:grid-cols-2">
            <div><dt className="text-sm text-slate-500">Ürün Kodu</dt><dd className="font-bold">{product.code}</dd></div>
            <div><dt className="text-sm text-slate-500">Barkod</dt><dd className="font-mono font-bold">{product.barcode}</dd></div>
            <div className="md:col-span-2"><dt className="text-sm text-slate-500">Ürün Açıklaması</dt><dd className="font-bold">{product.name}</dd></div>
          </dl>
          {!product.isActive && <p className="mt-4 rounded-lg bg-amber-50 p-3 font-semibold text-amber-800">Ürün pasif durumda.</p>}
          <Link
            href={`/labels/print?type=product&ids=${product.id}&layout=a4`}
            target="_blank"
            className="mt-6 block w-full rounded-xl bg-emerald-700 px-5 py-4 text-center font-bold text-white hover:bg-emerald-800"
          >
            🖨️ A4 3×5 SKU Etiketini Yazdır
          </Link>
        </div>
      )}
    </section>
  );
}

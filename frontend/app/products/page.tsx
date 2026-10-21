import { Suspense } from "react";
import Header from "@/components/layout/Header";
import ProductList from "@/components/products/ProductList";
import { prisma } from "@/lib/prisma";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";
import { getProductMainCategory, isKnownProductSubcategory } from "@/modules/products/product-category.utils";

// Product stock and prices must be loaded per request.
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products =
    await prisma.product.findMany({
      where: {
        tenantId:
          B2B_CONSTANTS.TENANT_ID,

        companyId:
          B2B_CONSTANTS.COMPANY_ID,

        isActive: true,
      },

      orderBy: [
        {
          category: "asc",
        },
        {
          name: "asc",
        },
      ],

      select: {
        id: true,
        code: true,
        barcode: true,
        name: true,
        brand: true,
        category: true,
        categoryRef: { select: { name: true, parent: { select: { name: true } } } },
        price: true,
        stock: true,
        reservedStock: true,
        vat: true,
        ownStock: true,
        imageUrl: true,
      },
    });

  const productViewModels =
    products.map(
      (product) => ({
        id: product.id,

        code:
          product.code,

        barcode:
          product.barcode,

        name:
          product.name,

        brand:
          product.brand,

        mainCategory:
          (() => {
            const mapped = getProductMainCategory(product.category);
            const parent = product.categoryRef?.parent?.name;
            // Prefer the dedicated paper group for legacy paper SKUs
            // that still point to a different parent category.
            return isKnownProductSubcategory(product.category)
              ? mapped
              : parent ?? mapped;
          })(),

        subCategory:
          ["Peçete", "Mendil"].includes(product.category)
            ? "Peçete ve Mendil"
            : product.category,

        price:
          product.price,

        vat:
          product.vat,

        ownStock:
          product.ownStock,

        imageUrl:
          product.imageUrl,

        availableStock:
          Math.max(
            0,
            product.stock -
              product.reservedStock,
          ),
      }),
    );

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-black text-slate-900">
            Ürünler
          </h1>

          <Suspense fallback={<p>Ürünler yükleniyor...</p>}>
            <ProductList products={productViewModels} />
          </Suspense>
        </div>
      </main>
    </>
  );
}
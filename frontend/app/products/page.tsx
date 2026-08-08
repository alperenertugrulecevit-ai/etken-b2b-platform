import Header from "@/components/layout/Header";
import ProductList from "@/components/products/ProductList";
import { prisma } from "@/lib/prisma";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";
import { getProductMainCategory } from "@/modules/products/product-category.utils";

type SearchParams = {
  q?: string | string[];
  category?: string | string[];
  subCategory?: string | string[];
  brand?: string | string[];
};

function getQueryValue(
  value: string | string[] | undefined,
) {
  return Array.isArray(value)
    ? value[0] ?? ""
    : value ?? "";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = await searchParams;

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
          getProductMainCategory(
            product.category,
          ),

        subCategory:
          product.category,

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

          <ProductList
            products={
              productViewModels
            }
            initialSearch={
              getQueryValue(
                query.q,
              )
            }
            initialCategory={
              getQueryValue(
                query.category,
              ) || "Tümü"
            }
            initialSubCategory={
              getQueryValue(
                query.subCategory,
              ) || "Tümü"
            }
            initialBrand={
              getQueryValue(
                query.brand,
              ) || "Tümü"
            }
          />
        </div>
      </main>
    </>
  );
}
import Header from "@/components/layout/Header";
import ProductList from "@/components/products/ProductList";
import { prisma } from "@/lib/prisma";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: {
      id: "asc",
    },
  });

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-100">
        <div className="max-w-7xl mx-auto px-8 py-10">
          <h1 className="text-4xl font-bold">Ürünler</h1>

          <ProductList products={products} />
        </div>
      </main>
    </>
  );
}
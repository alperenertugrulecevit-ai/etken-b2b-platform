import { products } from "../../data/products";

export default function ProductsPage() {
  return (
    <main className="min-h-screen bg-slate-100">

      <div className="max-w-7xl mx-auto px-8 py-12">

        <h1 className="text-4xl font-bold mb-10">
          Tüm Ürünler
        </h1>

        <div className="grid md:grid-cols-4 gap-8">

          {products.map((product) => (

            <div
              key={product.id}
              className="bg-white rounded-2xl shadow p-6 hover:shadow-xl transition"
            >

              <div className="h-40 bg-slate-200 rounded-xl flex items-center justify-center text-6xl">
                📦
              </div>

              <h2 className="font-bold mt-5">
                {product.name}
              </h2>

              <p className="text-gray-500 mt-2">
                {product.brand}
              </p>

              <p className="text-green-600 mt-2">
                Stok : {product.stock}
              </p>

              <p className="text-blue-900 text-2xl font-bold mt-5">
                {product.price.toFixed(2)} ₺
              </p>

              <button className="w-full mt-6 bg-blue-900 text-white py-3 rounded-xl">
                Sepete Ekle
              </button>

            </div>

          ))}

        </div>

      </div>

    </main>
  );
}
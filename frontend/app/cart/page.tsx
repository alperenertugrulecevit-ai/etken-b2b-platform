"use client";

import Header from "@/components/layout/Header";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const {
    cart,
    increaseQty,
    decreaseQty,
    removeItem,
    clearCart,
  } = useCart();

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-100">

        <div className="max-w-7xl mx-auto px-8 py-10">

          <h1 className="text-4xl font-bold mb-8">
            Sepetim
          </h1>

          {cart.length === 0 ? (

            <div className="bg-white rounded-2xl p-10 shadow">

              <h2 className="text-2xl font-bold">
                Sepetiniz Boş
              </h2>

              <p className="text-gray-500 mt-4">
                Henüz ürün eklemediniz.
              </p>

            </div>

          ) : (

            <div className="grid lg:grid-cols-3 gap-8">

              {/* Ürünler */}

              <div className="lg:col-span-2 space-y-5">

                {cart.map((item) => (

                  <div
                    key={item.code}
                    className="bg-white rounded-2xl p-6 shadow"
                  >

                    <div className="flex justify-between">

                      <div>

                        <h2 className="font-bold text-xl">
                          {item.name}
                        </h2>

                        <p className="text-gray-500 mt-2">
                          Kod : {item.code}
                        </p>

                        <p className="text-blue-900 font-bold mt-3">
                          {item.price.toFixed(2)} ₺
                        </p>

                      </div>

                      <div className="text-right">

                        <div className="text-2xl font-bold text-blue-900">
                          {(item.price * item.qty).toFixed(2)} ₺
                        </div>

                      </div>

                    </div>

                    <div className="flex items-center gap-3 mt-6">

                      <button
                        onClick={() => decreaseQty(item.code)}
                        className="w-10 h-10 rounded-lg bg-gray-200 text-xl"
                      >
                        −
                      </button>

                      <div className="text-xl font-bold w-8 text-center">
                        {item.qty}
                      </div>

                      <button
                        onClick={() => increaseQty(item.code)}
                        className="w-10 h-10 rounded-lg bg-blue-900 text-white text-xl"
                      >
                        +
                      </button>

                      <button
                        onClick={() => removeItem(item.code)}
                        className="ml-auto bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                      >
                        🗑 Sil
                      </button>

                    </div>

                  </div>

                ))}

              </div>

              {/* Sipariş Özeti */}

              <div className="bg-white rounded-2xl p-6 shadow h-fit">

                <h2 className="text-2xl font-bold">
                  Sipariş Özeti
                </h2>

                <div className="flex justify-between mt-8">

                  <span>Ara Toplam</span>

                  <span className="font-bold">
                    {total.toFixed(2)} ₺
                  </span>

                </div>

                <hr className="my-6" />

                {total < 500 ? (

                  <div className="bg-red-100 text-red-700 rounded-xl p-4">

                    Minimum sipariş tutarı
                    <strong> 500 ₺</strong> olmalıdır.

                  </div>

                ) : (

                  <div className="bg-green-100 text-green-700 rounded-xl p-4">

                    ✓ Sipariş vermeye uygunsunuz.

                  </div>

                )}

                <button
                  onClick={clearCart}
                  className="w-full mt-6 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600"
                >
                  Sepeti Temizle
                </button>

                <button
                  disabled={total < 500}
                  className={`w-full mt-4 py-4 rounded-xl font-bold ${
                    total >= 500
                      ? "bg-blue-900 text-white"
                      : "bg-gray-300 text-gray-500"
                  }`}
                >
                  Siparişi Tamamla
                </button>

              </div>

            </div>

          )}

        </div>

      </main>
    </>
  );
}
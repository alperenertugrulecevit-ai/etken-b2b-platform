"use client";

import Link from "next/link";

import Header from "@/components/layout/Header";
import {
  useCart,
} from "@/context/CartContext";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";

function formatCurrency(
  value: number
) {
  return value.toLocaleString(
    "tr-TR",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

export default function CartPage() {
  const {
    cart,
    isHydrated,
    increaseQty,
    decreaseQty,
    setQty,
    removeItem,
    clearCart,
  } = useCart();

  const netTotal =
    cart.reduce(
      (sum, item) =>
        sum +
        item.unitPrice *
          item.qty,
      0
    );

  const vatTotal =
    cart.reduce(
      (sum, item) => {
        const lineNet =
          item.unitPrice *
          item.qty;

        return (
          sum +
          lineNet *
            (item.vatRate /
              100)
        );
      },
      0
    );

  const grossTotal =
    netTotal + vatTotal;

  const remainingAmount =
    Math.max(
      0,
      B2B_CONSTANTS
        .MINIMUM_ORDER_NET_AMOUNT -
        netTotal
    );

  const canCheckout =
    cart.length > 0 &&
    remainingAmount <= 0;

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black">
                Sepetim
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Sipariş miktarlarını
                kontrol ederek devam
                edin.
              </p>
            </div>

            <Link
              href="/products"
              className="rounded-xl border border-[#202B38] bg-white px-4 py-2.5 text-sm font-bold text-[#202B38] hover:bg-slate-50"
            >
              + Ürün Ekle
            </Link>
          </div>

          {!isHydrated ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-8 text-center shadow">
              Sepet yükleniyor...
            </div>
          ) : cart.length === 0 ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-8 text-center shadow">
              <div className="text-5xl">
                🛒
              </div>

              <h2 className="mt-4 text-xl font-bold">
                Sepetiniz boş
              </h2>

              <p className="mt-3 text-gray-500">
                Henüz ürün
                eklemediniz.
              </p>

              <Link
                href="/products"
                className="mt-5 inline-flex rounded-lg bg-[#202B38] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#111923]"
              >
                Ürünleri İncele
              </Link>
            </div>
          ) : (
            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
              <div className="space-y-3">
                {cart.map(
                  (item) => {
                    const lineNet =
                      item.unitPrice *
                      item.qty;

                    const lineVat =
                      lineNet *
                      (item.vatRate /
                        100);

                    return (
                      <article
                        key={
                          item.code
                        }
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-wrap justify-between gap-5">
                          <div>
                            <Link
                              href={`/products/${item.code}`}
                              className="text-base font-black text-slate-900 hover:text-[#EF4B23]"
                            >
                              {
                                item.name
                              }
                            </Link>

                            <p className="mt-2 text-sm text-gray-500">
                              Kod:{" "}
                              {
                                item.code
                              }
                            </p>

                            <p className="mt-2 font-bold text-[#EF4B23]">
                              {formatCurrency(
                                item.unitPrice
                              )}{" "}
                              ₺ + KDV %
                              {
                                item.vatRate
                              }
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-xl font-black text-[#EF4B23]">
                              {formatCurrency(
                                lineNet
                              )}{" "}
                              ₺
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              KDV:{" "}
                              {formatCurrency(
                                lineVat
                              )}{" "}
                              ₺
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              decreaseQty(
                                item.code
                              )
                            }
                            className="h-9 w-9 rounded-lg bg-slate-200 text-xl font-bold text-slate-800 hover:bg-slate-300"
                          >
                            −
                          </button>

                          <input
                            type="number"
                            min="1"
                            max={
                              item.availableStock
                            }
                            value={
                              item.qty
                            }
                            onChange={(
                              event
                            ) =>
                              setQty(
                                item.code,
                                Number(
                                  event
                                    .target
                                    .value
                                )
                              )
                            }
                            className="h-9 w-20 rounded-lg border text-center text-lg font-bold"
                          />

                          <button
                            type="button"
                            disabled={
                              item.qty >=
                              item.availableStock
                            }
                            onClick={() =>
                              increaseQty(
                                item.code
                              )
                            }
                            className="h-9 w-9 rounded-lg bg-[#202B38] text-lg font-bold text-white hover:bg-[#111923] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                          >
                            +
                          </button>

                          <span className="text-sm text-gray-500">
                            En fazla{" "}
                            {
                              item.availableStock
                            }{" "}
                            adet
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              removeItem(
                                item.code
                              )
                            }
                            className="ml-auto rounded-lg bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700"
                          >
                            Sil
                          </button>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>

              <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-xl font-black">
                  Sipariş Özeti
                </h2>

                <div className="mt-5 space-y-3">
                  <div className="flex justify-between gap-4">
                    <span>
                      Ara Toplam
                    </span>

                    <strong>
                      {formatCurrency(
                        netTotal
                      )}{" "}
                      ₺
                    </strong>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span>
                      KDV
                    </span>

                    <strong>
                      {formatCurrency(
                        vatTotal
                      )}{" "}
                      ₺
                    </strong>
                  </div>

                  <hr />

                  <div className="flex justify-between gap-4 text-xl">
                    <span className="font-bold">
                      Genel Toplam
                    </span>

                    <strong className="text-[#EF4B23]">
                      {formatCurrency(
                        grossTotal
                      )}{" "}
                      ₺
                    </strong>
                  </div>
                </div>

                {remainingAmount >
                0 ? (
                  <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
                    Minimum sipariş
                    tutarı KDV hariç{" "}
                    <strong>
                      {formatCurrency(
                        B2B_CONSTANTS
                          .MINIMUM_ORDER_NET_AMOUNT
                      )}{" "}
                      ₺
                    </strong>
                    ’dir.

                    <p className="mt-2 text-sm">
                      Devam etmek için
                      sepetinize{" "}
                      <strong>
                        {formatCurrency(
                          remainingAmount
                        )}{" "}
                        ₺
                      </strong>{" "}
                      daha ürün
                      ekleyin.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 rounded-xl bg-green-50 p-4 font-semibold text-green-700">
                    ✓ Minimum sipariş
                    tutarı karşılandı.
                  </div>
                )}

                {canCheckout ? (
                  <Link
                    href="/checkout"
                    className="mt-6 block w-full rounded-xl bg-[#202B38] py-3 text-center text-sm font-bold text-white hover:bg-[#111923]"
                  >
                    Sipariş Adımına
                    Geç
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="mt-6 w-full cursor-not-allowed rounded-xl bg-slate-300 py-4 font-bold text-slate-500"
                  >
                    Sipariş Adımına
                    Geç
                  </button>
                )}

                <button
                  type="button"
                  onClick={clearCart}
                  className="mt-4 w-full rounded-xl border border-red-300 bg-white py-3 font-bold text-red-700 hover:bg-red-50"
                >
                  Sepeti Temizle
                </button>

                <p className="mt-5 text-xs leading-5 text-gray-500">
                  Fiyatlar KDV
                  hariçtir. Sipariş
                  onayında güncel fiyat
                  ve kullanılabilir stok
                  yeniden kontrol
                  edilir.
                </p>
              </aside>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

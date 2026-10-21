"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import ProductImage from "@/components/products/ProductImage";
import {
  useCart,
} from "@/context/CartContext";

type Product = {
  id: number;
  code: string;
  barcode: string;
  name: string;
  brand: string;

  mainCategory: string;
  subCategory: string;

  imageUrl: string | null;

  price: number;
  vat: number;
  availableStock: number;
  ownStock: boolean;
};

type Props = {
  products: Product[];
};

function normalizeText(
  value: string,
) {
  return value
    .toLocaleLowerCase(
      "tr-TR",
    )
    .trim();
}

function formatCurrency(
  value: number,
) {
  return value.toLocaleString(
    "tr-TR",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
}

export default function ProductList({
  products,
}: Props) {
  const searchParams = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const category = searchParams.get("category") || "Tümü";
  const subCategory = searchParams.get("subCategory") || "Tümü";
  const brand = searchParams.get("brand") || "Tümü";
  const returnTo = `/products${searchParams.size ? `?${searchParams.toString()}` : ""}`;

  function updateFilters(values: Record<string, string>) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(values)) {
      if (!value || value === "Tümü") params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    window.history.replaceState(null, "", `/products${query ? `?${query}` : ""}`);
  }

  useEffect(() => {
    try {
      const query = new URLSearchParams(window.location.search).toString();
      const key = `catalog-scroll:/products${query ? `?${query}` : ""}`;
      const saved = sessionStorage.getItem(key);
      if (saved === null) return;
      const frame = requestAnimationFrame(() => {
        sessionStorage.removeItem(key);
        window.scrollTo(0, Number(saved) || 0);
      });
      return () => cancelAnimationFrame(frame);
    } catch { /* Browsing must also work when storage is disabled. */ }
  }, []);


  const [
    addedCode,
    setAddedCode,
  ] = useState("");

  const [
    mobileFiltersOpen,
    setMobileFiltersOpen,
  ] = useState(false);

  const {
    cart,
    addToCart,
    increaseQty,
    decreaseQty,
  } = useCart();

  const categories =
    useMemo(
      () => [
        "Tümü",

        ...Array.from(
          new Set(
            products.map(
              (product) =>
                product.mainCategory,
            ),
          ),
        ).sort(
          (left, right) =>
            left.localeCompare(
              right,
              "tr",
            ),
        ),
      ],
      [
        products,
      ],
    );

  const subCategories =
    useMemo(
      () => [
        "Tümü",

        ...Array.from(
          new Set(
            products
              .filter(
                (product) =>
                  category ===
                    "Tümü" ||
                  product
                    .mainCategory ===
                    category,
              )
              .map(
                (product) =>
                  product
                    .subCategory,
              ),
          ),
        ).sort(
          (left, right) =>
            left.localeCompare(
              right,
              "tr",
            ),
        ),
      ],
      [
        products,
        category,
      ],
    );

  const brands =
    useMemo(
      () => [
        "Tümü",

        ...Array.from(
          new Set(
            products
              .filter(
                (product) => {
                  const categoryMatch =
                    category ===
                      "Tümü" ||
                    product
                      .mainCategory ===
                      category;

                  const subCategoryMatch =
                    subCategory ===
                      "Tümü" ||
                    product
                      .subCategory ===
                      subCategory;

                  return (
                    categoryMatch &&
                    subCategoryMatch
                  );
                },
              )
              .map(
                (product) =>
                  product.brand,
              ),
          ),
        ).sort(
          (left, right) =>
            left.localeCompare(
              right,
              "tr",
            ),
        ),
      ],
      [
        products,
        category,
        subCategory,
      ],
    );

  const filteredProducts =
    useMemo(
      () => {
        const query =
          normalizeText(
            search,
          );

        return products.filter(
          (product) => {
            const searchMatch =
              !query ||
              normalizeText(
                product.name,
              ).includes(
                query,
              ) ||
              normalizeText(
                product.brand,
              ).includes(
                query,
              ) ||
              normalizeText(
                product.code,
              ).includes(
                query,
              ) ||
              normalizeText(
                product.barcode,
              ).includes(
                query,
              );

            const categoryMatch =
              category ===
                "Tümü" ||
              product
                .mainCategory ===
                category;

            const subCategoryMatch =
              subCategory ===
                "Tümü" ||
              product
                .subCategory ===
                subCategory;

            const brandMatch =
              brand ===
                "Tümü" ||
              product.brand ===
                brand;

            return (
              searchMatch &&
              categoryMatch &&
              subCategoryMatch &&
              brandMatch
            );
          },
        );
      },
      [
        search,
        category,
        subCategory,
        brand,
        products,
      ],
    );

  function handleAdd(
    product: Product,
  ) {
    if (
      product.availableStock <=
      0
    ) {
      return;
    }

    addToCart({
      productId:
        product.id,

      code:
        product.code,

      name:
        product.name,

      unitPrice:
        product.price,

      vatRate:
        product.vat,

      availableStock:
        product.availableStock,

      imageUrl:
        product.imageUrl,

      qty: 1,
    });

    setAddedCode(
      product.code,
    );

    window.setTimeout(
      () =>
        setAddedCode(""),
      1500,
    );
  }

  function handleCategoryChange(
    value: string,
  ) {
    updateFilters({ category: value, subCategory: "Tümü", brand: "Tümü" });
  }

  function handleSubCategoryChange(value: string) {
    updateFilters({ subCategory: value, brand: "Tümü" });
  }

  function clearFilters() {
    updateFilters({ q: "", category: "Tümü", subCategory: "Tümü", brand: "Tümü" });
  }

  return (
    <div className="mt-5">
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {categories.map((item) => {
          const active = category === item;

          return (
            <button
              key={item}
              type="button"
              onClick={() => handleCategoryChange(item)}
              className={
                "shrink-0 rounded-full border px-4 py-2 text-xs font-black transition " +
                (active
                  ? "border-[#071729] bg-[#071729] text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-[#EF4B23] hover:text-[#EF4B23]")
              }
            >
              {item === "Tümü" ? "Tüm Ürünler" : item}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setMobileFiltersOpen((value) => !value)}
        className="mb-3 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm lg:hidden"
        aria-expanded={mobileFiltersOpen}
      >
        <span>Filtrele ve Ara</span>
        <span>{mobileFiltersOpen ? "Kapat" : "Aç"}</span>
      </button>

      <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside
        className={
          "h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-[154px] lg:max-h-[calc(100vh-170px)] lg:overflow-y-auto " +
          (mobileFiltersOpen ? "block" : "hidden lg:block")
        }
      >
        <h2 className="text-base font-black">
          Filtreler
        </h2>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-semibold">
            Ana Kategori
          </span>

          <select
            value={
              category
            }
            onChange={(
              event,
            ) =>
              handleCategoryChange(
                event
                  .target
                  .value,
              )
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
          >
            {categories.map(
              (item) => (
                <option
                  key={
                    item
                  }
                  value={
                    item
                  }
                >
                  {item}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-semibold">
            Alt Kategori
          </span>

          <select
            value={
              subCategory
            }
            onChange={(
              event,
            ) =>
              handleSubCategoryChange(
                event
                  .target
                  .value,
              )
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
          >
            {subCategories.map(
              (item) => (
                <option
                  key={
                    item
                  }
                  value={
                    item
                  }
                >
                  {item}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-semibold">
            Marka
          </span>

          <select
            value={
              brand
            }
            onChange={(
              event,
            ) =>
              updateFilters({ brand: event.target.value })
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
          >
            {brands.map(
              (item) => (
                <option
                  key={
                    item
                  }
                  value={
                    item
                  }
                >
                  {item}
                </option>
              ),
            )}
          </select>
        </label>

        <button
          type="button"
          onClick={
            clearFilters
          }
          className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Filtreleri Temizle
        </button>
      </aside>

      <section>
        <div className="sticky top-[126px] z-30 mb-4 bg-slate-100 py-2">
        <input
          value={
            search
          }
          onChange={(
            event,
          ) =>
            updateFilters({ q: event.target.value })
          }
          placeholder="Ürün, marka, kod veya barkod ara..."
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-[#EF4B23]"
        />
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-gray-500">
          <span>
            {
              filteredProducts.length
            }{" "}
            ürün bulundu
          </span>

          {addedCode ? (
            <span
              role="status"
              className="rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700"
            >
              {
                addedCode
              }{" "}
              sepete eklendi
            </span>
          ) : null}
        </div>

        {filteredProducts.length ===
        0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow">
            <h2 className="text-2xl font-bold">
              Ürün bulunamadı
            </h2>

            <p className="mt-3 text-gray-500">
              Arama veya filtre
              kriterlerini
              değiştirin.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filteredProducts.map(
              (product) => {
                const grossPrice =
                  product.price *
                  (
                    1 +
                    product.vat /
                      100
                  );

                const isComingSoon =
                  product.price <=
                  0;

                const isOutOfStock =
                  !isComingSoon &&
                  product
                    .availableStock <=
                    0;

                const cannotAddToCart =
                  isComingSoon ||
                  isOutOfStock;

                const cartItem = cart.find(
                  (item) => item.code === product.code,
                );

                return (
                  <article
                    key={
                      product.id
                    }
                    className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <Link
                      href={`/products/${encodeURIComponent(product.code)}?returnTo=${encodeURIComponent(returnTo)}`}
                      onClick={() => {
                        try {
                          sessionStorage.setItem(`catalog-scroll:${returnTo}`, String(window.scrollY));
                        } catch { /* Optional scroll restoration. */ }
                      }}
                      className="flex-1"
                    >
                      <ProductImage
                        imageUrl={
                          product.imageUrl
                        }
                        productName={
                          product.name
                        }
                        className="h-28 rounded-lg border border-slate-100 p-2"
                        fallbackClassName="h-28 rounded-lg text-4xl"
                      />

                      <p className="mt-3 text-xs font-black uppercase tracking-wide text-[#EF4B23]">
                        {
                          product.mainCategory
                        }
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {
                          product.subCategory
                        }
                      </p>

                      <h2 className="mt-2 min-h-10 text-sm font-black leading-5 text-slate-900">
                        {
                          product.name
                        }
                      </h2>

                      <p className="mt-2 text-sm text-gray-500">
                        {
                          product.brand
                        }{" "}
                        ·{" "}
                        {
                          product.code
                        }
                      </p>

                      {isComingSoon || isOutOfStock ? (
                        <p className={`mt-3 text-sm font-semibold ${isComingSoon ? "text-amber-700" : "text-red-600"}`}>
                          {isComingSoon ? "Fiyat bilgisi hazırlanıyor" : "Stokta yok"}
                        </p>
                      ) : null}

                      {isComingSoon ? (
                        <div className="mt-3">
                          <p className="text-lg font-black text-amber-700">
                            Yakında Stokta
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Fiyat bilgisi
                            yakında
                            yayınlanacaktır.
                          </p>
                        </div>
                      ) : (
                        <>
                          <p className="mt-3 text-lg font-black text-[#EF4B23]">
                            {formatCurrency(
                              grossPrice,
                            )}{" "}
                            ₺
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            KDV dahil
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            KDV hariç:{" "}
                            {formatCurrency(
                              product.price,
                            )}{" "}
                            ₺ · KDV %{product.vat}
                          </p>
                        </>
                      )}
                    </Link>

                    {cartItem && !cannotAddToCart ? (
                      <div className="mt-3 flex overflow-hidden rounded-lg border border-[#EF4B23]">
                        <button type="button" onClick={() => decreaseQty(product.code)} className="w-11 bg-orange-50 text-lg font-black text-[#EF4B23] hover:bg-orange-100">−</button>
                        <button type="button" onClick={() => handleAdd(product)} className="min-w-0 flex-1 bg-[#EF4B23] py-2.5 text-sm font-bold text-white hover:bg-[#D83D18]">
                          Sepette {cartItem.qty}
                        </button>
                        <button type="button" disabled={cartItem.qty >= product.availableStock} onClick={() => increaseQty(product.code)} className="w-11 bg-orange-50 text-lg font-black text-[#EF4B23] hover:bg-orange-100 disabled:cursor-not-allowed disabled:text-slate-300">+</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={cannotAddToCart}
                        onClick={() => handleAdd(product)}
                        className="mt-3 w-full rounded-lg bg-[#EF4B23] py-2.5 text-sm font-bold text-white transition hover:bg-[#D83D18] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                      >
                        {isComingSoon ? "Yakında Stokta" : isOutOfStock ? "Stokta Yok" : "Sepete Ekle"}
                      </button>
                    )}
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
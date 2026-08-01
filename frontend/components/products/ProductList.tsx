"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

import {
  useCart,
} from "@/context/CartContext";

type Product = {
  id: number;
  code: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  vat: number;
  availableStock: number;
  ownStock: boolean;
};

type Props = {
  products: Product[];
  initialSearch?: string;
  initialCategory?: string;
  initialBrand?: string;
};

function normalizeText(
  value: string
) {
  return value
    .toLocaleLowerCase(
      "tr-TR"
    )
    .trim();
}

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

export default function ProductList({
  products,
  initialSearch = "",
  initialCategory = "Tümü",
  initialBrand = "Tümü",
}: Props) {
  const [
    search,
    setSearch,
  ] = useState(initialSearch);

  const [
    category,
    setCategory,
  ] = useState(
    initialCategory
  );

  const [
    brand,
    setBrand,
  ] = useState(initialBrand);

  const [
    addedCode,
    setAddedCode,
  ] = useState("");

  const { addToCart } =
    useCart();

  const categories =
    useMemo(
      () => [
        "Tümü",
        ...Array.from(
          new Set(
            products.map(
              (product) =>
                product.category
            )
          )
        ).sort((a, b) =>
          a.localeCompare(
            b,
            "tr"
          )
        ),
      ],
      [products]
    );

  const brands = useMemo(
    () => [
      "Tümü",
      ...Array.from(
        new Set(
          products.map(
            (product) =>
              product.brand
          )
        )
      ).sort((a, b) =>
        a.localeCompare(
          b,
          "tr"
        )
      ),
    ],
    [products]
  );

  const filteredProducts =
    useMemo(() => {
      const query =
        normalizeText(search);

      return products.filter(
        (product) => {
          const searchMatch =
            !query ||
            normalizeText(
              product.name
            ).includes(query) ||
            normalizeText(
              product.brand
            ).includes(query) ||
            normalizeText(
              product.code
            ).includes(query) ||
            normalizeText(
              product.barcode
            ).includes(query);

          const categoryMatch =
            category === "Tümü" ||
            product.category ===
              category;

          const brandMatch =
            brand === "Tümü" ||
            product.brand ===
              brand;

          return (
            searchMatch &&
            categoryMatch &&
            brandMatch
          );
        }
      );
    }, [
      search,
      category,
      brand,
      products,
    ]);

  function handleAdd(
    product: Product
  ) {
    if (
      product.availableStock <= 0
    ) {
      return;
    }

    addToCart({
      productId: product.id,
      code: product.code,
      name: product.name,
      unitPrice:
        product.price,
      vatRate: product.vat,
      availableStock:
        product.availableStock,
      qty: 1,
    });

    setAddedCode(
      product.code
    );

    window.setTimeout(
      () =>
        setAddedCode(""),
      1500
    );
  }

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-black">
          Filtreler
        </h2>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-semibold">
            Kategori
          </span>

          <select
            value={category}
            onChange={(event) =>
              setCategory(
                event.target.value
              )
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
          >
            {categories.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}
          </select>
        </label>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-semibold">
            Marka
          </span>

          <select
            value={brand}
            onChange={(event) =>
              setBrand(
                event.target.value
              )
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
          >
            {brands.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}
          </select>
        </label>

        <button
          type="button"
          onClick={() => {
            setSearch("");
            setCategory("Tümü");
            setBrand("Tümü");
          }}
          className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Filtreleri Temizle
        </button>
      </aside>

      <section>
        <input
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Ürün, marka, kod veya barkod ara..."
          className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-[#EF4B23]"
        />

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
              {addedCode} sepete
              eklendi
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
              kriterlerini değiştirin.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filteredProducts.map(
              (product) => {
                const grossPrice =
                  product.price *
                  (1 +
                    product.vat /
                      100);

                const isOutOfStock =
                  product
                    .availableStock <=
                  0;

                return (
                  <article
                    key={
                      product.id
                    }
                    className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <Link
                      href={`/products/${product.code}`}
                      className="flex-1"
                    >
                      <div className="flex h-24 items-center justify-center rounded-lg bg-slate-100 text-4xl">
                        📦
                      </div>

                      <p className="mt-3 text-xs font-black uppercase tracking-wide text-[#EF4B23]">
                        {
                          product.category
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

                      <p
                        className={`mt-3 text-sm font-semibold ${
                          isOutOfStock
                            ? "text-red-600"
                            : "text-green-700"
                        }`}
                      >
                        {isOutOfStock
                          ? "Stokta yok"
                          : `Stok: ${product.availableStock} adet`}
                      </p>

                      <p className="mt-3 text-lg font-black text-[#EF4B23]">
                        {formatCurrency(
                          product.price
                        )}{" "}
                        ₺
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        KDV hariç · KDV
                        %
                        {
                          product.vat
                        }
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        KDV dâhil:{" "}
                        {formatCurrency(
                          grossPrice
                        )}{" "}
                        ₺
                      </p>
                    </Link>

                    <button
                      type="button"
                      disabled={
                        isOutOfStock
                      }
                      onClick={() =>
                        handleAdd(
                          product
                        )
                      }
                      className="mt-3 w-full rounded-lg bg-[#202B38] py-2.5 text-sm font-bold text-white transition hover:bg-[#111923] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                    >
                      {isOutOfStock
                        ? "Stokta Yok"
                        : "Sepete Ekle"}
                    </button>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  transferProductBetweenHandlingUnits,
  type HandlingUnitTransferState,
} from "@/app/admin/handling-units/transfers/actions";

type HandlingUnitProductOption = {
  itemId: number;
  productId: number;
  code: string;
  barcode: string;
  name: string;
  quantity: number;
  reservedStock: number;
  availableQuantity: number;
  isActive: boolean;
};

type HandlingUnitOption = {
  id: number;
  barcode: string;
  unitType: string;
  status: string;

  warehouseCode: string;
  warehouseName: string;
  locationCode: string;

  totalQuantity: number;
  reservedQuantity: number;

  products: HandlingUnitProductOption[];
};

type Props = {
  handlingUnits: HandlingUnitOption[];
};

const initialState: HandlingUnitTransferState = {
  success: false,
  message: "",

  sourceUnitId: null,
  sourceBarcode: "",
  sourceStockQuantity: 0,

  targetUnitId: null,
  targetBarcode: "",
  targetStockQuantity: 0,

  transferredQuantity: 0,
};

export default function HandlingUnitProductTransferForm({
  handlingUnits,
}: Props) {
  const sourceInputRef =
    useRef<HTMLInputElement>(null);

  const productInputRef =
    useRef<HTMLInputElement>(null);

  /*
   * Aynı Server Action sonucunun birden fazla
   * işlenmesini önler.
   */
  const lastHandledTransferRef =
    useRef("");

  /*
   * Form gönderildiği andaki ürünü saklar.
   * Server Action başarılı olduğunda kaynak
   * ve hedef ürün listelerini bu bilgiyle
   * güncelleriz.
   */
  const submittedProductRef =
    useRef<HandlingUnitProductOption | null>(
      null
    );

  const [
    sourceBarcode,
    setSourceBarcode,
  ] = useState("");

  const [
    targetBarcode,
    setTargetBarcode,
  ] = useState("");

  const [
    productBarcode,
    setProductBarcode,
  ] = useState("");

  const [quantity, setQuantity] =
    useState("1");

  const [
    totalTransferredQuantity,
    setTotalTransferredQuantity,
  ] = useState(0);

  const [
    showActionMessage,
    setShowActionMessage,
  ] = useState(true);

  /*
   * Koli ve paletlerin güncel toplam stokları.
   */
  const [
    currentUnitQuantities,
    setCurrentUnitQuantities,
  ] = useState<Record<string, number>>(
    () =>
      Object.fromEntries(
        handlingUnits.map((unit) => [
          unit.barcode.toUpperCase(),
          unit.totalQuantity,
        ])
      )
  );

  /*
   * Her koli/palet içindeki güncel ürünler.
   *
   * Böylece bir işlemden sonra sayfa
   * yenilenmeden yeni transfer yapılabilir.
   */
  const [
    currentUnitProducts,
    setCurrentUnitProducts,
  ] = useState<
    Record<
      string,
      HandlingUnitProductOption[]
    >
  >(() =>
    Object.fromEntries(
      handlingUnits.map((unit) => [
        unit.barcode.toUpperCase(),
        unit.products.map(
          (product) => ({
            ...product,
          })
        ),
      ])
    )
  );

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    transferProductBetweenHandlingUnits,
    initialState
  );

  const normalizedSourceBarcode =
    sourceBarcode
      .trim()
      .toUpperCase();

  const normalizedTargetBarcode =
    targetBarcode
      .trim()
      .toUpperCase();

  const normalizedProductBarcode =
    productBarcode
      .trim()
      .toUpperCase();

  const sourceUnit = useMemo(
    () =>
      handlingUnits.find(
        (unit) =>
          unit.barcode
            .trim()
            .toUpperCase() ===
          normalizedSourceBarcode
      ),
    [
      handlingUnits,
      normalizedSourceBarcode,
    ]
  );

  const targetUnit = useMemo(
    () =>
      handlingUnits.find(
        (unit) =>
          unit.barcode
            .trim()
            .toUpperCase() ===
          normalizedTargetBarcode
      ),
    [
      handlingUnits,
      normalizedTargetBarcode,
    ]
  );

  /*
   * Yalnızca seçilen kaynak THM içinde
   * bulunan ve miktarı sıfırdan büyük
   * ürünleri gösterir.
   */
  const sourceProducts = useMemo(() => {
    if (!normalizedSourceBarcode) {
      return [];
    }

    return (
      currentUnitProducts[
        normalizedSourceBarcode
      ] ?? []
    )
      .filter(
        (product) =>
          product.quantity > 0
      )
      .sort((first, second) =>
        first.code.localeCompare(
          second.code,
          "tr"
        )
      );
  }, [
    currentUnitProducts,
    normalizedSourceBarcode,
  ]);

  const selectedProduct = useMemo(
    () =>
      sourceProducts.find(
        (product) =>
          product.barcode
            .trim()
            .toUpperCase() ===
            normalizedProductBarcode ||
          product.code
            .trim()
            .toUpperCase() ===
            normalizedProductBarcode
      ),
    [
      sourceProducts,
      normalizedProductBarcode,
    ]
  );

  const sourceStockQuantity =
    normalizedSourceBarcode
      ? currentUnitQuantities[
          normalizedSourceBarcode
        ] ?? 0
      : 0;

  const targetStockQuantity =
    normalizedTargetBarcode
      ? currentUnitQuantities[
          normalizedTargetBarcode
        ] ?? 0
      : 0;

  /*
   * Sunucudan gelen yeni veriler olduğunda
   * tarayıcı tarafındaki listeleri yeniden
   * oluşturur.
   */
  useEffect(() => {
    setCurrentUnitQuantities(
      Object.fromEntries(
        handlingUnits.map((unit) => [
          unit.barcode.toUpperCase(),
          unit.totalQuantity,
        ])
      )
    );

    setCurrentUnitProducts(
      Object.fromEntries(
        handlingUnits.map((unit) => [
          unit.barcode.toUpperCase(),

          unit.products.map(
            (product) => ({
              ...product,
            })
          ),
        ])
      )
    );
  }, [handlingUnits]);

  useEffect(() => {
    sourceInputRef.current?.focus();
  }, []);

  /*
   * Kaynak değiştiğinde eski kaynağın ürün
   * seçimi temizlenir.
   */
  useEffect(() => {
    setProductBarcode("");
    setQuantity("1");
  }, [normalizedSourceBarcode]);

  /*
   * Başarılı Server Action sonucunu yalnızca
   * bir kez işler.
   */
  useEffect(() => {
    if (!state.success) {
      return;
    }

    const transferResultKey = [
      state.sourceUnitId,
      state.targetUnitId,
      state.sourceBarcode,
      state.targetBarcode,
      state.sourceStockQuantity,
      state.targetStockQuantity,
      state.transferredQuantity,
      state.message,
    ].join("|");

    if (
      lastHandledTransferRef.current ===
      transferResultKey
    ) {
      return;
    }

    lastHandledTransferRef.current =
      transferResultKey;

    setShowActionMessage(true);

    const sourceKey =
      state.sourceBarcode
        .trim()
        .toUpperCase();

    const targetKey =
      state.targetBarcode
        .trim()
        .toUpperCase();

    setCurrentUnitQuantities(
      (current) => ({
        ...current,

        [sourceKey]:
          state.sourceStockQuantity,

        [targetKey]:
          state.targetStockQuantity,
      })
    );

    const submittedProduct =
      submittedProductRef.current;

    /*
     * Kaynak ve hedef içindeki ürün
     * miktarlarını sayfa yenilenmeden
     * günceller.
     */
    if (submittedProduct) {
      setCurrentUnitProducts(
        (current) => {
          const sourceProductList =
            current[sourceKey] ?? [];

          const targetProductList =
            current[targetKey] ?? [];

          const nextSourceProducts =
            sourceProductList
              .map((product) => {
                if (
                  product.productId !==
                  submittedProduct.productId
                ) {
                  return product;
                }

                const nextQuantity =
                  Math.max(
                    0,
                    product.quantity -
                      state.transferredQuantity
                  );

                return {
                  ...product,

                  quantity:
                    nextQuantity,

                  availableQuantity:
                    Math.max(
                      0,
                      nextQuantity -
                        product.reservedStock
                    ),
                };
              })
              .filter(
                (product) =>
                  product.quantity > 0
              );

          const targetProductIndex =
            targetProductList.findIndex(
              (product) =>
                product.productId ===
                submittedProduct.productId
            );

          let nextTargetProducts:
            HandlingUnitProductOption[];

          if (
            targetProductIndex >= 0
          ) {
            nextTargetProducts =
              targetProductList.map(
                (product, index) => {
                  if (
                    index !==
                    targetProductIndex
                  ) {
                    return product;
                  }

                  const nextQuantity =
                    product.quantity +
                    state.transferredQuantity;

                  return {
                    ...product,

                    quantity:
                      nextQuantity,

                    availableQuantity:
                      Math.max(
                        0,
                        nextQuantity -
                          product.reservedStock
                      ),
                  };
                }
              );
          } else {
            nextTargetProducts = [
              ...targetProductList,

              {
                ...submittedProduct,

                /*
                 * Hedefte yeni satır oluştuğu
                 * için geçici bir negatif ID
                 * kullanılır. Veritabanındaki
                 * gerçek kayıt Server Action
                 * tarafından oluşturulmuştur.
                 */
                itemId:
                  -Date.now(),

                quantity:
                  state.transferredQuantity,

                reservedStock: 0,

                availableQuantity:
                  state.transferredQuantity,
              },
            ];
          }

          return {
            ...current,

            [sourceKey]:
              nextSourceProducts,

            [targetKey]:
              nextTargetProducts,
          };
        }
      );
    }

    setTotalTransferredQuantity(
      (current) =>
        current +
        state.transferredQuantity
    );

    setProductBarcode("");
    setQuantity("1");

    submittedProductRef.current =
      null;

    window.setTimeout(() => {
      productInputRef.current?.focus();
    }, 100);
  }, [
    state.success,
    state.message,
    state.sourceUnitId,
    state.targetUnitId,
    state.sourceBarcode,
    state.targetBarcode,
    state.sourceStockQuantity,
    state.targetStockQuantity,
    state.transferredQuantity,
  ]);

  function swapSourceAndTarget() {
    setSourceBarcode(
      targetBarcode
    );

    setTargetBarcode(
      sourceBarcode
    );

    setProductBarcode("");
    setQuantity("1");

    submittedProductRef.current =
      null;
  }

  function clearTransferForm() {
    setSourceBarcode("");
    setTargetBarcode("");
    setProductBarcode("");
    setQuantity("1");

    setTotalTransferredQuantity(0);

    setShowActionMessage(false);

    submittedProductRef.current =
      null;

    /*
     * lastHandledTransferRef özellikle
     * temizlenmez. Temizlenirse eski başarılı
     * Server Action sonucu tekrar işlenebilir.
     */

    window.setTimeout(() => {
      sourceInputRef.current?.focus();
    }, 100);
  }

  function handleSourceKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      event.preventDefault();

      if (normalizedSourceBarcode) {
        productInputRef.current?.focus();
      }
    }
  }

  function handleFormSubmit() {
    setShowActionMessage(true);

    submittedProductRef.current =
      selectedProduct
        ? {
            ...selectedProduct,
          }
        : null;
  }

  const numericQuantity =
    Number(quantity);

  const canSubmit =
    normalizedSourceBarcode.length > 0 &&
    normalizedTargetBarcode.length > 0 &&
    normalizedProductBarcode.length > 0 &&
    normalizedSourceBarcode !==
      normalizedTargetBarcode &&
    Boolean(sourceUnit) &&
    Boolean(targetUnit) &&
    Boolean(selectedProduct) &&
    (selectedProduct
      ?.availableQuantity ?? 0) > 0 &&
    Number.isInteger(
      numericQuantity
    ) &&
    numericQuantity > 0 &&
    numericQuantity <=
      (selectedProduct
        ?.availableQuantity ?? 0);

  return (
    <form
      action={formAction}
      onSubmit={handleFormSubmit}
      className="rounded-2xl bg-white p-8 shadow"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            Koli / Palet Arası Ürün
            Transferi
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Önce kaynak taşıma birimini
            okutun. Ürün alanında yalnızca
            kaynak içindeki ürünler
            listelenecektir.
          </p>
        </div>

        <button
          type="button"
          onClick={
            clearTransferForm
          }
          disabled={isPending}
          className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Temizle
        </button>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <article className="rounded-2xl bg-orange-50 p-6">
          <p className="text-sm font-semibold uppercase text-orange-700">
            Kaynak THM Stok Miktarı
          </p>

          <p className="mt-3 text-4xl font-bold text-orange-800">
            {sourceStockQuantity.toLocaleString(
              "tr-TR"
            )}
          </p>

          <p className="mt-3 truncate font-mono text-sm font-semibold text-orange-700">
            {normalizedSourceBarcode ||
              "Kaynak seçilmedi"}
          </p>
        </article>

        <article className="rounded-2xl bg-green-50 p-6">
          <p className="text-sm font-semibold uppercase text-green-700">
            Hedef THM Stok Miktarı
          </p>

          <p className="mt-3 text-4xl font-bold text-green-800">
            {targetStockQuantity.toLocaleString(
              "tr-TR"
            )}
          </p>

          <p className="mt-3 truncate font-mono text-sm font-semibold text-green-700">
            {normalizedTargetBarcode ||
              "Hedef seçilmedi"}
          </p>
        </article>

        <article className="rounded-2xl bg-blue-50 p-6">
          <p className="text-sm font-semibold uppercase text-blue-700">
            Toplam Transfer Miktarı
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-900">
            {totalTransferredQuantity.toLocaleString(
              "tr-TR"
            )}
          </p>

          <p className="mt-3 text-sm font-semibold text-blue-700">
            Bu ekran açıkken yapılan
            transferler
          </p>
        </article>
      </div>

      {showActionMessage &&
        state.message && (
          <div
            role="alert"
            className={`mt-6 rounded-xl border p-5 ${
              state.success
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <p className="font-bold">
              {state.success
                ? "Transfer başarılı"
                : "Transfer gerçekleştirilemedi"}
            </p>

            <p className="mt-2 leading-6">
              {state.message}
            </p>

            {state.success && (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-white/70 p-3">
                  <p className="text-xs font-semibold uppercase">
                    Kaynak Yeni Bakiye
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {
                      state.sourceStockQuantity
                    }
                  </p>
                </div>

                <div className="rounded-lg bg-white/70 p-3">
                  <p className="text-xs font-semibold uppercase">
                    Hedef Yeni Bakiye
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {
                      state.targetStockQuantity
                    }
                  </p>
                </div>

                <div className="rounded-lg bg-white/70 p-3">
                  <p className="text-xs font-semibold uppercase">
                    Transfer Edilen
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {
                      state.transferredQuantity
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      <datalist id="handling-unit-options">
        {handlingUnits.map(
          (unit) => {
            const unitKey =
              unit.barcode.toUpperCase();

            return (
              <option
                key={unit.id}
                value={unit.barcode}
              >
                {unit.unitType}
                {" — "}
                {unit.status}
                {" — Miktar: "}
                {currentUnitQuantities[
                  unitKey
                ] ??
                  unit.totalQuantity}
              </option>
            );
          }
        )}
      </datalist>

      <datalist id="source-product-options">
        {sourceProducts.map(
          (product) => (
            <option
              key={product.itemId}
              value={
                product.barcode
              }
            >
              {product.code}
              {" — "}
              {product.name}
              {" — Kullanılabilir: "}
              {
                product.availableQuantity
              }
            </option>
          )
        )}

        {sourceProducts.map(
          (product) => (
            <option
              key={`code-${product.itemId}`}
              value={product.code}
            >
              {product.barcode}
              {" — "}
              {product.name}
              {" — Kullanılabilir: "}
              {
                product.availableQuantity
              }
            </option>
          )
        )}
      </datalist>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_90px_1fr]">
        <label>
          <span className="mb-2 block text-sm font-semibold">
            Kaynak Koli / Palet
          </span>

          <input
            ref={sourceInputRef}
            name="sourceBarcode"
            list="handling-unit-options"
            value={sourceBarcode}
            onChange={(event) =>
              setSourceBarcode(
                event.target.value.toUpperCase()
              )
            }
            onKeyDown={
              handleSourceKeyDown
            }
            autoComplete="off"
            placeholder="Kaynak barkodu okutun"
            className="w-full rounded-xl border p-5 font-mono text-xl uppercase"
            disabled={isPending}
            required
          />

          {sourceUnit && (
            <div className="mt-3 rounded-xl bg-orange-50 p-4 text-sm text-orange-800">
              <p className="font-bold">
                {sourceUnit.unitType}
                {" — "}
                {sourceUnit.status}
              </p>

              <p className="mt-1">
                Ürün çeşidi:{" "}
                {sourceProducts.length}
                {" — "}
                Toplam stok:{" "}
                {sourceStockQuantity}
              </p>

              <p className="mt-1">
                Adres:{" "}
                {sourceUnit.warehouseCode &&
                sourceUnit.locationCode
                  ? `${sourceUnit.warehouseCode} / ${sourceUnit.locationCode}`
                  : "Adreslenmedi"}
              </p>
            </div>
          )}
        </label>

        <div className="flex items-end justify-center">
          <button
            type="button"
            onClick={
              swapSourceAndTarget
            }
            disabled={isPending}
            className="mb-7 rounded-xl border border-slate-300 bg-white px-5 py-4 text-xl font-bold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            title="Kaynak ve hedefi değiştir"
          >
            ⇄
          </button>
        </div>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Hedef Koli / Palet
          </span>

          <input
            name="targetBarcode"
            list="handling-unit-options"
            value={targetBarcode}
            onChange={(event) =>
              setTargetBarcode(
                event.target.value.toUpperCase()
              )
            }
            autoComplete="off"
            placeholder="Hedef barkodu okutun"
            className="w-full rounded-xl border p-5 font-mono text-xl uppercase"
            disabled={isPending}
            required
          />

          {targetUnit && (
            <div className="mt-3 rounded-xl bg-green-50 p-4 text-sm text-green-800">
              <p className="font-bold">
                {targetUnit.unitType}
                {" — "}
                {targetUnit.status}
              </p>

              <p className="mt-1">
                Toplam stok:{" "}
                {targetStockQuantity}
              </p>

              <p className="mt-1">
                Adres:{" "}
                {targetUnit.warehouseCode &&
                targetUnit.locationCode
                  ? `${targetUnit.warehouseCode} / ${targetUnit.locationCode}`
                  : "Adreslenmedi"}
              </p>
            </div>
          )}
        </label>
      </div>

      {normalizedSourceBarcode &&
        normalizedTargetBarcode &&
        normalizedSourceBarcode ===
          normalizedTargetBarcode && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
            Kaynak ve hedef barkod aynı
            olamaz.
          </div>
        )}

      <div className="mt-8 rounded-2xl border p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">
              Kaynak İçindeki Ürünler
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Ürün alanında yalnızca
              aşağıdaki ürünler
              seçilebilir.
            </p>
          </div>

          <div className="rounded-xl bg-slate-100 px-5 py-3 text-center">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Ürün Çeşidi
            </p>

            <p className="mt-1 text-2xl font-bold">
              {sourceProducts.length}
            </p>
          </div>
        </div>

        <div className="mt-5 max-h-80 overflow-y-auto rounded-xl border">
          {sourceProducts.map(
            (product) => (
              <button
                key={product.itemId}
                type="button"
                onClick={() => {
                  setProductBarcode(
                    product.barcode
                  );

                  setQuantity("1");
                }}
                disabled={
                  isPending ||
                  product.availableQuantity <=
                    0 ||
                  !product.isActive
                }
                className={`grid w-full items-center gap-4 border-b p-4 text-left hover:bg-slate-50 md:grid-cols-[170px_170px_1fr_110px_110px_130px] ${
                  product.availableQuantity <=
                    0 ||
                  !product.isActive
                    ? "cursor-not-allowed opacity-50"
                    : ""
                }`}
              >
                <span className="font-bold text-blue-900">
                  {product.code}
                </span>

                <span className="font-mono text-sm">
                  {product.barcode}
                </span>

                <span className="font-semibold">
                  {product.name}
                </span>

                <span>
                  <span className="block text-xs text-gray-400">
                    Miktar
                  </span>

                  <span className="font-bold">
                    {product.quantity}
                  </span>
                </span>

                <span>
                  <span className="block text-xs text-gray-400">
                    Rezerve
                  </span>

                  <span className="font-bold text-orange-700">
                    {
                      product.reservedStock
                    }
                  </span>
                </span>

                <span>
                  <span className="block text-xs text-gray-400">
                    Kullanılabilir
                  </span>

                  <span className="font-bold text-green-700">
                    {
                      product.availableQuantity
                    }
                  </span>
                </span>
              </button>
            )
          )}

          {sourceUnit &&
            sourceProducts.length ===
              0 && (
              <div className="p-10 text-center text-gray-500">
                Seçilen kaynak taşıma
                biriminde ürün bulunmuyor.
              </div>
            )}

          {!sourceUnit && (
            <div className="p-10 text-center text-gray-500">
              Ürünleri görüntülemek için
              önce kaynak koli veya palet
              barkodunu okutun.
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-[1fr_240px]">
        <label>
          <span className="mb-2 block text-sm font-semibold">
            Kaynak Ürün
          </span>

          <input
            ref={productInputRef}
            name="productBarcode"
            list="source-product-options"
            value={productBarcode}
            onChange={(event) =>
              setProductBarcode(
                event.target.value.toUpperCase()
              )
            }
            autoComplete="off"
            placeholder={
              sourceUnit
                ? "Kaynak içindeki ürünü seçin"
                : "Önce kaynak barkodu okutun"
            }
            className="w-full rounded-xl border p-5 font-mono text-xl uppercase disabled:cursor-not-allowed disabled:bg-slate-100"
            disabled={
              isPending ||
              !sourceUnit ||
              sourceProducts.length === 0
            }
            required
          />

          {normalizedProductBarcode &&
            !selectedProduct && (
              <p className="mt-2 font-semibold text-red-700">
                Seçilen ürün kaynak
                taşıma biriminde
                bulunmuyor.
              </p>
            )}

          {selectedProduct && (
            <div className="mt-3 rounded-xl bg-blue-50 p-4 text-blue-900">
              <p className="font-bold">
                {selectedProduct.code}
                {" — "}
                {selectedProduct.name}
              </p>

              <p className="mt-2 text-sm">
                Toplam:{" "}
                {selectedProduct.quantity}
                {" | "}
                Rezerve:{" "}
                {
                  selectedProduct.reservedStock
                }
                {" | "}
                Transfer edilebilir:{" "}
                {
                  selectedProduct.availableQuantity
                }
              </p>
            </div>
          )}
        </label>

        <label>
          <span className="mb-2 block text-sm font-semibold">
            Transfer Miktarı
          </span>

          <input
            name="quantity"
            type="number"
            min="1"
            max={
              selectedProduct
                ?.availableQuantity
            }
            step="1"
            value={quantity}
            onChange={(event) =>
              setQuantity(
                event.target.value
              )
            }
            className="w-full rounded-xl border p-5 text-xl disabled:cursor-not-allowed disabled:bg-slate-100"
            disabled={
              isPending ||
              !selectedProduct
            }
            required
          />

          {selectedProduct && (
            <p className="mt-2 text-xs text-gray-500">
              En fazla{" "}
              <strong>
                {
                  selectedProduct.availableQuantity
                }
              </strong>{" "}
              adet transfer edilebilir.
            </p>
          )}
        </label>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {[1, 5, 10, 24, 50].map(
          (quickQuantity) => (
            <button
              key={quickQuantity}
              type="button"
              onClick={() =>
                setQuantity(
                  String(
                    Math.min(
                      quickQuantity,
                      selectedProduct
                        ?.availableQuantity ??
                        quickQuantity
                    )
                  )
                )
              }
              disabled={
                isPending ||
                !selectedProduct
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {quickQuantity} Adet
            </button>
          )
        )}
      </div>

      <button
        type="submit"
        disabled={
          isPending || !canSubmit
        }
        className={`mt-8 w-full rounded-xl py-5 text-lg font-bold ${
          !isPending && canSubmit
            ? "bg-blue-900 text-white hover:bg-blue-800"
            : "cursor-not-allowed bg-slate-300 text-slate-500"
        }`}
      >
        {isPending
          ? "Ürün Transfer Ediliyor..."
          : "Ürünü Hedef Koli / Palete Transfer Et"}
      </button>
    </form>
  );
}
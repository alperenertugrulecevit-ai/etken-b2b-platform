"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  closeWaveShippingUnitAction,
  rfPackWaveItemAction,
  type RFPackingState,
} from "@/app/rf/packing/actions";

type DistributionProduct = {
  productId: number;
  productCode: string;
  productBarcode: string;
  productName: string;
  plannedQuantity: number;
  pickedQuantity: number;
  packedQuantity: number;
  availableQuantity: number;
};

type DistributionOption = {
  id: string;
  waveId: string;
  waveNo: string;
  sequenceNumber: number;
  distributionCode: string;
  customerCode: string;
  customerName: string;
  addressTitle: string;
  city: string;
  district: string;
  plannedOrderCount: number;
  plannedLineCount: number;
  plannedQuantity: number;
  packedQuantity: number;
  remainingQuantity: number;
  products: DistributionProduct[];
};

type SourceUnitOption = {
  id: number;
  barcode: string;
  unitType: string;
  waveId: string;
  totalQuantity: number;

  products: {
    productId: number;
    productCode: string;
    productBarcode: string;
    productName: string;
    quantity: number;
  }[];
};

type TargetUnitOption = {
  id: number;
  barcode: string;
  unitType: string;
  waveId: string | null;
  distributionId: string | null;
  packageSequence: number | null;
  totalQuantity: number;
  isOpen: boolean;
};

type Props = {
  distributions: DistributionOption[];
  sourceUnits: SourceUnitOption[];
  targetUnits: TargetUnitOption[];
};

const initialState: RFPackingState = {
  success: false,
  message: "",

  distributionCode: "",
  waveNo: "",
  customerName: "",

  sourceBarcode: "",
  sourceQuantityAfter: 0,

  targetBarcode: "",
  targetQuantityAfter: 0,

  packageSequence: 0,

  productCode: "",
  productName: "",

  packedQuantity: 0,

  distributionPackedQuantity: 0,
  distributionPlannedQuantity: 0,
  distributionCompleted: false,
};

function normalize(
  value: string
) {
  return value
    .trim()
    .toUpperCase();
}

export default function RFProductDrivenPackingForm({
  distributions,
  sourceUnits,
  targetUnits,
}: Props) {
  const router =
    useRouter();

  const sourceRef =
    useRef<HTMLInputElement>(
      null
    );

  const productRef =
    useRef<HTMLInputElement>(
      null
    );

  const targetRef =
    useRef<HTMLInputElement>(
      null
    );

  const quantityRef =
    useRef<HTMLInputElement>(
      null
    );

  const [
    sourceBarcode,
    setSourceBarcode,
  ] = useState("");

  const [
    productBarcode,
    setProductBarcode,
  ] = useState("");

  const [
    targetBarcode,
    setTargetBarcode,
  ] = useState("");

  const [
    quantity,
    setQuantity,
  ] = useState("1");

  const [
    terminalCode,
    setTerminalCode,
  ] = useState("");

  const [
    closeMessage,
    setCloseMessage,
  ] = useState("");

  const [
    isClosing,
    startClosing,
  ] = useTransition();

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    rfPackWaveItemAction,
    initialState
  );

  const normalizedSource =
    normalize(
      sourceBarcode
    );

  const normalizedProduct =
    normalize(
      productBarcode
    );

  const normalizedTarget =
    normalize(
      targetBarcode
    );

  const selectedSource =
    useMemo(
      () =>
        sourceUnits.find(
          (unit) =>
            normalize(
              unit.barcode
            ) ===
            normalizedSource
        ) ?? null,
      [
        normalizedSource,
        sourceUnits,
      ]
    );

  const selectedSourceProduct =
    useMemo(() => {
      if (
        !selectedSource ||
        !normalizedProduct
      ) {
        return null;
      }

      return (
        selectedSource.products.find(
          (product) =>
            normalize(
              product.productBarcode
            ) ===
              normalizedProduct ||
            normalize(
              product.productCode
            ) ===
              normalizedProduct
        ) ?? null
      );
    }, [
      normalizedProduct,
      selectedSource,
    ]);

  const matchingDistributions =
    useMemo(() => {
      if (
        !selectedSource ||
        !selectedSourceProduct
      ) {
        return [];
      }

      return distributions
        .filter(
          (distribution) =>
            distribution.waveId ===
              selectedSource.waveId &&
            distribution.products.some(
              (product) =>
                product.productId ===
                  selectedSourceProduct.productId &&
                product.availableQuantity >
                  0
            )
        )
        .sort(
          (
            left,
            right
          ) =>
            left.sequenceNumber -
            right.sequenceNumber
        );
    }, [
      distributions,
      selectedSource,
      selectedSourceProduct,
    ]);

  /*
   * Ürünü bekleyen en düşük dağılım
   * sıra numaralı alıcı otomatik seçilir.
   */
  const selectedDistribution =
    matchingDistributions[0] ??
    null;

  const selectedDistributionProduct =
    useMemo(() => {
      if (
        !selectedDistribution ||
        !selectedSourceProduct
      ) {
        return null;
      }

      return (
        selectedDistribution.products.find(
          (product) =>
            product.productId ===
            selectedSourceProduct.productId
        ) ?? null
      );
    }, [
      selectedDistribution,
      selectedSourceProduct,
    ]);

  const compatibleTargets =
    useMemo(() => {
      if (
        !selectedDistribution
      ) {
        return [];
      }

      return targetUnits.filter(
        (unit) => {
          if (
            unit.distributionId ===
              selectedDistribution.id &&
            unit.isOpen
          ) {
            return true;
          }

          return (
            unit.distributionId ===
              null &&
            unit.totalQuantity ===
              0 &&
            (
              unit.waveId ===
                null ||
              unit.waveId ===
                selectedDistribution.waveId
            )
          );
        }
      );
    }, [
      selectedDistribution,
      targetUnits,
    ]);

  const selectedTarget =
    useMemo(
      () =>
        compatibleTargets.find(
          (unit) =>
            normalize(
              unit.barcode
            ) ===
            normalizedTarget
        ) ?? null,
      [
        compatibleTargets,
        normalizedTarget,
      ]
    );

  useEffect(() => {
    if (!state.success) {
      return;
    }

    setSourceBarcode(
      state.sourceBarcode
    );

    setTargetBarcode(
      state.targetBarcode
    );

    setProductBarcode("");
    setQuantity("1");
    setCloseMessage("");

    router.refresh();

    window.setTimeout(
      () => {
        productRef.current?.focus();
      },
      100
    );
  }, [
    router,
    state,
  ]);

  useEffect(() => {
    if (
      !targetBarcode ||
      !selectedDistribution
    ) {
      return;
    }

    const currentTarget =
      targetUnits.find(
        (unit) =>
          normalize(
            unit.barcode
          ) ===
          normalizedTarget
      );

    if (
      currentTarget &&
      currentTarget.distributionId !==
        null &&
      currentTarget.distributionId !==
        selectedDistribution.id
    ) {
      setTargetBarcode("");
    }
  }, [
    normalizedTarget,
    selectedDistribution,
    targetBarcode,
    targetUnits,
  ]);

  function clearSource() {
    setSourceBarcode("");
    setProductBarcode("");
    setTargetBarcode("");
    setQuantity("1");
    setCloseMessage("");

    window.setTimeout(
      () => {
        sourceRef.current?.focus();
      },
      50
    );
  }

  function clearProduct() {
    setProductBarcode("");
    setTargetBarcode("");
    setQuantity("1");
    setCloseMessage("");

    window.setTimeout(
      () => {
        productRef.current?.focus();
      },
      50
    );
  }

  function clearTarget() {
    setTargetBarcode("");
    setQuantity("1");
    setCloseMessage("");

    window.setTimeout(
      () => {
        targetRef.current?.focus();
      },
      50
    );
  }

  function handleSourceKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (
      event.key !==
      "Enter"
    ) {
      return;
    }

    event.preventDefault();

    if (
      normalizedSource
    ) {
      productRef.current?.focus();
    }
  }

  function handleProductKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (
      event.key !==
      "Enter"
    ) {
      return;
    }

    event.preventDefault();

    if (
      normalizedProduct &&
      selectedDistribution
    ) {
      targetRef.current?.focus();
    }
  }

  function handleTargetKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (
      event.key !==
      "Enter"
    ) {
      return;
    }

    event.preventDefault();

    if (
      normalizedTarget
    ) {
      quantityRef.current?.focus();
      quantityRef.current?.select();
    }
  }

  function closeTargetUnit() {
    if (
      !selectedTarget ||
      !selectedTarget.packageSequence
    ) {
      setCloseMessage(
        "Önce daha önce paketleme yapılmış açık bir Sevk THM okutun."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `${selectedTarget.barcode} Sevk THM kapatılsın ve sevke hazır hâle getirilsin mi? Bu THM'ye daha sonra ürün eklenemez.`
      );

    if (!confirmed) {
      return;
    }

    startClosing(
      async () => {
        const result =
          await closeWaveShippingUnitAction(
            selectedTarget.barcode,
            terminalCode
          );

        setCloseMessage(
          result.message
        );

        if (
          result.success
        ) {
          setTargetBarcode("");
          setProductBarcode("");
          setQuantity("1");

          router.refresh();

          window.setTimeout(
            () => {
              productRef.current?.focus();
            },
            100
          );
        }
      }
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-br from-cyan-950 to-slate-950 p-5 text-white shadow-lg">
        <p className="text-xs font-black uppercase tracking-widest text-cyan-300">
          Ürün Odaklı Wave Dağılımı
        </p>

        <h2 className="mt-2 text-2xl font-black">
          Ürünü Okut, Alıcıyı Sistem Göstersin
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-300">
          Toplama THM&apos;ini ve ürünü
          okutun. Sistem ürünü bekleyen
          en düşük sıra numaralı alıcıyı
          otomatik seçer ve Sevk THM&apos;ini
          bu alıcıya bağlar.
        </p>

        <div className="mt-4 rounded-xl bg-white/10 p-4 text-sm font-bold">
          Toplama THM → Ürün → Alıcı →
          Sevk THM → Miktar
        </div>
      </section>

      {state.message && (
        <section
          role="alert"
          className={`rounded-2xl border p-5 ${
            state.success
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          <p className="font-black">
            {state.success
              ? "Paketleme başarılı"
              : "İşlem tamamlanamadı"}
          </p>

          <p className="mt-2 leading-6">
            {state.message}
          </p>

          {state.success && (
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
              <div className="rounded-xl bg-white/70 p-3">
                <p className="font-bold">
                  Dağılım
                </p>

                <p className="mt-1 font-black">
                  {
                    state.distributionCode
                  }
                </p>
              </div>

              <div className="rounded-xl bg-white/70 p-3">
                <p className="font-bold">
                  Koli
                </p>

                <p className="mt-1 font-black">
                  {
                    state.packageSequence
                  }
                </p>
              </div>

              <div className="rounded-xl bg-white/70 p-3">
                <p className="font-bold">
                  Aktarılan
                </p>

                <p className="mt-1 font-black">
                  {
                    state.packedQuantity
                  }{" "}
                  adet
                </p>
              </div>

              <div className="rounded-xl bg-white/70 p-3">
                <p className="font-bold">
                  Sevk THM toplamı
                </p>

                <p className="mt-1 font-black">
                  {
                    state.targetQuantityAfter
                  }{" "}
                  adet
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {closeMessage && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 font-bold text-blue-900">
          {closeMessage}
        </section>
      )}

      <form
        action={formAction}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <input
          type="hidden"
          name="distributionCode"
          value={
            selectedDistribution
              ?.distributionCode ??
            ""
          }
        />

        <div className="grid gap-5 lg:grid-cols-2">
          <label className="block lg:col-span-2">
            <span className="mb-2 block text-sm font-black text-slate-800">
              1. Kaynak Toplama THM
            </span>

            <div className="flex gap-2">
              <input
                ref={
                  sourceRef
                }
                name="sourceBarcode"
                list="product-driven-packing-sources"
                value={
                  sourceBarcode
                }
                onChange={(
                  event
                ) => {
                  setSourceBarcode(
                    event.target.value.toUpperCase()
                  );

                  setProductBarcode("");
                  setTargetBarcode("");
                  setQuantity("1");
                  setCloseMessage("");
                }}
                onKeyDown={
                  handleSourceKeyDown
                }
                placeholder="Wave Toplama THM barkodunu okutun"
                autoComplete="off"
                className="min-w-0 flex-1 rounded-xl border-2 border-violet-300 bg-violet-50 p-4 font-mono text-xl font-black uppercase"
                required
              />

              {sourceBarcode && (
                <button
                  type="button"
                  onClick={
                    clearSource
                  }
                  className="rounded-xl bg-slate-800 px-4 font-black text-white"
                >
                  Temizle
                </button>
              )}
            </div>

            <datalist id="product-driven-packing-sources">
              {sourceUnits.map(
                (unit) => (
                  <option
                    key={
                      unit.id
                    }
                    value={
                      unit.barcode
                    }
                  >
                    {
                      unit.unitType
                    }{" "}
                    —{" "}
                    {
                      unit.totalQuantity
                    }{" "}
                    adet
                  </option>
                )
              )}
            </datalist>

            {normalizedSource &&
              !selectedSource && (
              <p className="mt-2 text-sm font-bold text-red-700">
                Paketlemeye açık Wave
                Toplama THM bulunamadı.
              </p>
            )}

            {selectedSource && (
              <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-4">
                <p className="font-black text-violet-950">
                  {
                    selectedSource.barcode
                  }{" "}
                  —{" "}
                  {
                    selectedSource.unitType
                  }
                </p>

                <p className="mt-1 text-sm text-violet-800">
                  İçerik:{" "}
                  {
                    selectedSource.totalQuantity
                  }{" "}
                  adet · SKU:{" "}
                  {
                    selectedSource.products.length
                  }
                </p>
              </div>
            )}
          </label>

          <label className="block lg:col-span-2">
            <span className="mb-2 block text-sm font-black text-slate-800">
              2. Ürün Barkodu
            </span>

            <div className="flex gap-2">
              <input
                ref={
                  productRef
                }
                name="productBarcode"
                value={
                  productBarcode
                }
                onChange={(
                  event
                ) => {
                  setProductBarcode(
                    event.target.value.toUpperCase()
                  );

                  setTargetBarcode("");
                  setQuantity("1");
                  setCloseMessage("");
                }}
                onKeyDown={
                  handleProductKeyDown
                }
                placeholder={
                  selectedSource
                    ? "Ürün barkodunu okutun"
                    : "Önce Toplama THM okutun"
                }
                disabled={
                  !selectedSource
                }
                autoComplete="off"
                className="min-w-0 flex-1 rounded-xl border-2 border-orange-300 bg-orange-50 p-4 font-mono text-xl font-black uppercase disabled:bg-slate-100"
                required
              />

              {productBarcode && (
                <button
                  type="button"
                  onClick={
                    clearProduct
                  }
                  className="rounded-xl bg-slate-800 px-4 font-black text-white"
                >
                  Temizle
                </button>
              )}
            </div>

            {normalizedProduct &&
              selectedSource &&
              !selectedSourceProduct && (
              <p className="mt-2 text-sm font-bold text-red-700">
                Okutulan ürün bu Toplama
                THM içinde bulunmuyor.
              </p>
            )}

            {selectedSourceProduct &&
              matchingDistributions.length ===
                0 && (
              <p className="mt-2 text-sm font-bold text-red-700">
                Bu ürün için paketlenebilir
                alıcı ihtiyacı bulunmuyor.
              </p>
            )}
          </label>

          {selectedDistribution &&
            selectedDistributionProduct && (
            <section className="rounded-2xl border-2 border-cyan-400 bg-cyan-50 p-5 lg:col-span-2">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-700">
                Ürünün Gideceği Alıcı
              </p>

              <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-3xl font-black text-cyan-950">
                    Sıra{" "}
                    {String(
                      selectedDistribution.sequenceNumber
                    ).padStart(
                      3,
                      "0"
                    )}
                  </p>

                  <p className="mt-2 text-xl font-black text-slate-950">
                    {
                      selectedDistribution.customerCode
                    }{" "}
                    —{" "}
                    {
                      selectedDistribution.customerName
                    }
                  </p>

                  <p className="mt-2 font-bold text-slate-700">
                    {
                      selectedDistribution.addressTitle
                    }
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    {
                      selectedDistribution.district
                    }{" "}
                    /{" "}
                    {
                      selectedDistribution.city
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-white p-4 text-right shadow-sm">
                  <p className="text-xs font-bold uppercase text-slate-500">
                    Dağılım Kodu
                  </p>

                  <p className="mt-1 font-mono text-lg font-black text-cyan-900">
                    {
                      selectedDistribution.distributionCode
                    }
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-600">
                    {
                      selectedDistribution.plannedOrderCount
                    }{" "}
                    sipariş
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs font-bold text-slate-500">
                    Ürün ihtiyacı
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {
                      selectedDistributionProduct.plannedQuantity
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs font-bold text-slate-500">
                    Paketlenen
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {
                      selectedDistributionProduct.packedQuantity
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs font-bold text-slate-500">
                    Şimdi aktarılabilir
                  </p>

                  <p className="mt-1 text-xl font-black text-emerald-700">
                    {
                      selectedDistributionProduct.availableQuantity
                    }
                  </p>
                </div>
              </div>
            </section>
          )}

          <label className="block lg:col-span-2">
            <span className="mb-2 block text-sm font-black text-slate-800">
              3. Hedef Sevk THM
            </span>

            <div className="flex gap-2">
              <input
                ref={
                  targetRef
                }
                name="targetBarcode"
                list="product-driven-packing-targets"
                value={
                  targetBarcode
                }
                onChange={(
                  event
                ) => {
                  setTargetBarcode(
                    event.target.value.toUpperCase()
                  );

                  setQuantity("1");
                  setCloseMessage("");
                }}
                onKeyDown={
                  handleTargetKeyDown
                }
                placeholder={
                  selectedDistribution
                    ? "Sevk THM barkodunu okutun"
                    : "Önce ürün barkodunu okutun"
                }
                disabled={
                  !selectedDistribution
                }
                autoComplete="off"
                className="min-w-0 flex-1 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 font-mono text-xl font-black uppercase disabled:bg-slate-100"
                required
              />

              {targetBarcode && (
                <button
                  type="button"
                  onClick={
                    clearTarget
                  }
                  className="rounded-xl bg-slate-800 px-4 font-black text-white"
                >
                  Değiştir
                </button>
              )}
            </div>

            <datalist id="product-driven-packing-targets">
              {compatibleTargets.map(
                (unit) => (
                  <option
                    key={
                      unit.id
                    }
                    value={
                      unit.barcode
                    }
                  >
                    {unit.packageSequence
                      ? `Koli ${unit.packageSequence} — ${unit.totalQuantity} adet`
                      : "Yeni boş Sevk THM"}
                  </option>
                )
              )}
            </datalist>

            {normalizedTarget &&
              selectedDistribution &&
              !selectedTarget && (
              <p className="mt-2 text-sm font-bold text-red-700">
                Bu Sevk THM başka bir
                alıcıya bağlı, kapalı veya
                kullanıma uygun değil.
              </p>
            )}

            {selectedTarget && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-emerald-950">
                      {
                        selectedTarget.barcode
                      }
                    </p>

                    <p className="mt-1 text-sm text-emerald-800">
                      {selectedTarget.packageSequence
                        ? `Alıcıya bağlı Koli ${selectedTarget.packageSequence}`
                        : "İlk kayıt sırasında gösterilen alıcıya bağlanacak"}
                    </p>
                  </div>

                  {selectedTarget.packageSequence && (
                    <button
                      type="button"
                      onClick={
                        closeTargetUnit
                      }
                      disabled={
                        isClosing
                      }
                      className="rounded-xl bg-red-700 px-4 py-3 font-black text-white disabled:bg-slate-400"
                    >
                      {isClosing
                        ? "Kapatılıyor..."
                        : "Koliyi Kapat"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-800">
              4. Miktar
            </span>

            <input
              ref={
                quantityRef
              }
              name="quantity"
              type="number"
              min={1}
              max={
                selectedDistributionProduct
                  ?.availableQuantity
              }
              step={1}
              value={
                quantity
              }
              onChange={(
                event
              ) =>
                setQuantity(
                  event.target.value
                )
              }
              disabled={
                !selectedTarget
              }
              className="w-full rounded-xl border-2 border-slate-300 p-4 text-xl font-black disabled:bg-slate-100"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-800">
              Terminal Kodu
            </span>

            <input
              name="terminalCode"
              value={
                terminalCode
              }
              onChange={(
                event
              ) =>
                setTerminalCode(
                  event.target.value.toUpperCase()
                )
              }
              placeholder="Örn. RF-01"
              maxLength={40}
              className="w-full rounded-xl border border-slate-300 p-4 uppercase"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={
            isPending ||
            !selectedSource ||
            !selectedSourceProduct ||
            !selectedDistribution ||
            !selectedDistributionProduct ||
            !selectedTarget
          }
          className={`mt-6 w-full rounded-xl py-4 text-lg font-black text-white ${
            isPending
              ? "cursor-not-allowed bg-slate-400"
              : "bg-cyan-800 hover:bg-cyan-700"
          }`}
        >
          {isPending
            ? "Sevk THM'e aktarılıyor..."
            : "Ürünü Gösterilen Alıcıya Aktar"}
        </button>
      </form>
    </div>
  );
}
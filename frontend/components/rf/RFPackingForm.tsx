"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
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
  value: string,
) {
  return value.trim().toUpperCase();
}

export default function RFPackingForm({
  distributions,
  sourceUnits,
  targetUnits,
}: Props) {
  const router = useRouter();

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    rfPackWaveItemAction,
    initialState,
  );

  const [
    distributionCode,
    setDistributionCode,
  ] = useState("");

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

  const [
    quantity,
    setQuantity,
  ] = useState("1");

  const [
    closeMessage,
    setCloseMessage,
  ] = useState("");

  const [
    closeSuccess,
    setCloseSuccess,
  ] = useState(false);

  const [
    isClosing,
    setIsClosing,
  ] = useState(false);

  const distributionRef =
    useRef<HTMLInputElement>(null);

  const sourceRef =
    useRef<HTMLInputElement>(null);

  const targetRef =
    useRef<HTMLInputElement>(null);

  const productRef =
    useRef<HTMLInputElement>(null);

  const normalizedDistribution =
    normalize(
      distributionCode,
    );

  const normalizedSource =
    normalize(sourceBarcode);

  const normalizedTarget =
    normalize(targetBarcode);

  const normalizedProduct =
    normalize(productBarcode);

  const selectedDistribution =
    useMemo(
      () =>
        distributions.find(
          (distribution) =>
            normalize(
              distribution.distributionCode,
            ) ===
            normalizedDistribution,
        ),
      [
        distributions,
        normalizedDistribution,
      ],
    );

  const availableSources =
    useMemo(
      () =>
        selectedDistribution
          ? sourceUnits.filter(
              (unit) =>
                unit.waveId ===
                  selectedDistribution.waveId &&
                unit.totalQuantity > 0,
            )
          : [],
      [
        selectedDistribution,
        sourceUnits,
      ],
    );

  const selectedSource =
    useMemo(
      () =>
        availableSources.find(
          (unit) =>
            normalize(
              unit.barcode,
            ) ===
            normalizedSource,
        ),
      [
        availableSources,
        normalizedSource,
      ],
    );

  const availableTargets =
    useMemo(
      () =>
        selectedDistribution
          ? targetUnits.filter(
              (unit) =>
                (
                  unit.distributionId ===
                    null &&
                  unit.totalQuantity ===
                    0
                ) ||
                (
                  unit.distributionId ===
                    selectedDistribution.id &&
                  unit.isOpen
                ),
            )
          : [],
      [
        selectedDistribution,
        targetUnits,
      ],
    );

  const selectedTarget =
    useMemo(
      () =>
        availableTargets.find(
          (unit) =>
            normalize(
              unit.barcode,
            ) ===
            normalizedTarget,
        ),
      [
        availableTargets,
        normalizedTarget,
      ],
    );

  const selectedProduct =
    useMemo(() => {
      if (
        !selectedDistribution ||
        !normalizedProduct
      ) {
        return null;
      }

      return (
        selectedDistribution.products.find(
          (product) =>
            normalize(
              product.productBarcode,
            ) ===
              normalizedProduct ||
            normalize(
              product.productCode,
            ) ===
              normalizedProduct,
        ) ?? null
      );
    }, [
      selectedDistribution,
      normalizedProduct,
    ]);

  const recommendedProduct =
    useMemo(() => {
      if (
        !selectedDistribution ||
        !selectedSource
      ) {
        return null;
      }

      return (
        selectedDistribution.products.find(
          (product) =>
            product.availableQuantity >
              0 &&
            selectedSource.products.some(
              (sourceProduct) =>
                sourceProduct.productId ===
                  product.productId &&
                sourceProduct.quantity >
                  0,
            ),
        ) ?? null
      );
    }, [
      selectedDistribution,
      selectedSource,
    ]);

  const progressPercentage =
    selectedDistribution
      ? Math.min(
          100,
          Math.round(
            (
              selectedDistribution.packedQuantity /
              Math.max(
                1,
                selectedDistribution.plannedQuantity,
              )
            ) * 100,
          ),
        )
      : 0;

  useEffect(() => {
    if (!state.success) {
      return;
    }

    setDistributionCode(
      state.distributionCode,
    );

    setSourceBarcode(
      state.sourceBarcode,
    );

    setTargetBarcode(
      state.targetBarcode,
    );

    setProductBarcode("");
    setQuantity("1");
    setCloseMessage("");

    router.refresh();

    window.setTimeout(() => {
      productRef.current?.focus();
    }, 100);
  }, [
    state,
    router,
  ]);

  function changeDistribution() {
    setDistributionCode("");
    setSourceBarcode("");
    setTargetBarcode("");
    setProductBarcode("");
    setQuantity("1");
    setCloseMessage("");

    window.setTimeout(() => {
      distributionRef.current?.focus();
    }, 100);
  }

  function changeSource() {
    setSourceBarcode("");
    setProductBarcode("");
    setQuantity("1");

    window.setTimeout(() => {
      sourceRef.current?.focus();
    }, 100);
  }

  function changeTarget() {
    setTargetBarcode("");
    setProductBarcode("");
    setQuantity("1");
    setCloseMessage("");

    window.setTimeout(() => {
      targetRef.current?.focus();
    }, 100);
  }

  async function closeTarget() {
    if (
      !selectedTarget ||
      isClosing
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `${selectedTarget.barcode} Sevk THM kapatılsın ve sevke hazır hâle getirilsin mi? Bu koliye daha sonra ürün eklenemez.`,
      );

    if (!confirmed) {
      return;
    }

    setIsClosing(true);
    setCloseMessage("");

    try {
      const result =
        await closeWaveShippingUnitAction(
          selectedTarget.barcode,
        );

      setCloseSuccess(
        result.success,
      );

      setCloseMessage(
        result.message,
      );

      if (result.success) {
        setTargetBarcode("");
        setProductBarcode("");
        setQuantity("1");
        router.refresh();

        window.setTimeout(() => {
          targetRef.current?.focus();
        }, 100);
      }
    } finally {
      setIsClosing(false);
    }
  }

  function clearForm() {
    setDistributionCode("");
    setSourceBarcode("");
    setTargetBarcode("");
    setProductBarcode("");
    setQuantity("1");
    setCloseMessage("");

    window.setTimeout(() => {
      distributionRef.current?.focus();
    }, 100);
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl bg-white p-4 shadow md:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">
            Dağılım Barkod Akışı
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Alıcı Sırası → Toplama THM
            → Sevk THM → Ürün → Miktar
          </p>
        </div>

        <button
          type="button"
          onClick={clearForm}
          disabled={
            isPending || isClosing
          }
          className="rounded-xl bg-red-50 px-4 py-3 font-bold text-red-700 disabled:opacity-50"
        >
          Temizle
        </button>
      </div>

      {state.message && (
        <div
          role="alert"
          className={`mt-4 rounded-xl border p-4 ${
            state.success
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          <p className="font-black">
            {state.success
              ? "✓ Paketleme Başarılı"
              : "✕ Paketleme Başarısız"}
          </p>

          <p className="mt-2 text-sm leading-6">
            {state.message}
          </p>
        </div>
      )}

      {closeMessage && (
        <div
          role="status"
          className={`mt-4 rounded-xl border p-4 text-sm font-bold ${
            closeSuccess
              ? "border-blue-300 bg-blue-50 text-blue-900"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {closeMessage}
        </div>
      )}

      <datalist id="packing-distributions">
        {distributions.map(
          (distribution) => (
            <option
              key={distribution.id}
              value={
                distribution.distributionCode
              }
            >
              {distribution.waveNo}
              {" — "}
              {distribution.customerCode}
              {" — "}
              {distribution.customerName}
              {" — Kalan: "}
              {distribution.remainingQuantity}
            </option>
          ),
        )}
      </datalist>

      <datalist id="packing-sources">
        {availableSources.map(
          (unit) => (
            <option
              key={unit.id}
              value={unit.barcode}
            >
              {unit.unitType}
              {" — Miktar: "}
              {unit.totalQuantity}
            </option>
          ),
        )}
      </datalist>

      <datalist id="packing-targets">
        {availableTargets.map(
          (unit) => (
            <option
              key={unit.id}
              value={unit.barcode}
            >
              {unit.packageSequence
                ? `Koli ${unit.packageSequence}`
                : "Yeni Sevk THM"}
              {" — Miktar: "}
              {unit.totalQuantity}
            </option>
          ),
        )}
      </datalist>

      <div className="mt-5 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-black">
            1. Alıcı Dağılım Sırası
          </span>

          <input
            ref={distributionRef}
            name="distributionCode"
            list="packing-distributions"
            value={distributionCode}
            onChange={(event) => {
              setDistributionCode(
                event.target.value.toUpperCase(),
              );
              setSourceBarcode("");
              setTargetBarcode("");
              setProductBarcode("");
            }}
            autoComplete="off"
            placeholder="Örnek: W000001-001"
            className="w-full rounded-xl border-2 border-slate-300 p-4 font-mono text-xl font-bold uppercase focus:border-cyan-700 focus:outline-none"
            disabled={isPending}
            required
          />

          {normalizedDistribution &&
            !selectedDistribution && (
              <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
                Paketlemeye açık dağılım
                sırası bulunamadı.
              </p>
            )}

          {selectedDistribution && (
            <div className="mt-2 flex items-start justify-between gap-3 rounded-xl bg-cyan-50 p-3 text-cyan-950">
              <div>
                <span className="inline-flex rounded-full bg-cyan-200 px-3 py-1 font-mono text-sm font-black">
                  {selectedDistribution.sequenceNumber
                    .toString()
                    .padStart(
                      3,
                      "0",
                    )}
                </span>

                <p className="mt-2 font-black">
                  {selectedDistribution.customerCode}
                  {" — "}
                  {selectedDistribution.customerName}
                </p>

                <p className="mt-1 text-sm">
                  {selectedDistribution.addressTitle}
                  {" · "}
                  {selectedDistribution.district}
                  {" / "}
                  {selectedDistribution.city}
                </p>

                <p className="mt-2 text-sm font-bold">
                  {selectedDistribution.plannedOrderCount}{" "}
                  sipariş · Kalan{" "}
                  {selectedDistribution.remainingQuantity}{" "}
                  adet
                </p>
              </div>

              <button
                type="button"
                onClick={changeDistribution}
                className="rounded-lg border border-cyan-300 bg-white px-3 py-2 text-xs font-black"
              >
                Değiştir
              </button>
            </div>
          )}
        </label>

        {selectedDistribution && (
          <div>
            <div className="flex justify-between text-xs font-bold text-slate-600">
              <span>
                Dağılım İlerlemesi
              </span>

              <span>
                %{progressPercentage}
              </span>
            </div>

            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-cyan-600"
                style={{
                  width: `${progressPercentage}%`,
                }}
              />
            </div>
          </div>
        )}

        <label className="block">
          <span className="mb-2 block text-sm font-black">
            2. Kaynak Toplama THM
          </span>

          <input
            ref={sourceRef}
            name="sourceBarcode"
            list="packing-sources"
            value={sourceBarcode}
            onChange={(event) => {
              setSourceBarcode(
                event.target.value.toUpperCase(),
              );
              setProductBarcode("");
            }}
            autoComplete="off"
            placeholder={
              selectedDistribution
                ? "Toplama THM barkodunu okut"
                : "Önce dağılım sırası seçin"
            }
            className="w-full rounded-xl border-2 border-slate-300 p-4 font-mono text-xl font-bold uppercase focus:border-cyan-700 focus:outline-none disabled:bg-slate-100"
            disabled={
              isPending ||
              !selectedDistribution
            }
            required
          />

          {selectedSource && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-violet-50 p-3 text-violet-900">
              <p className="font-bold">
                {selectedSource.unitType}
                {" · "}
                {selectedSource.totalQuantity}{" "}
                adet
              </p>

              <button
                type="button"
                onClick={changeSource}
                className="rounded-lg border border-violet-300 bg-white px-3 py-2 text-xs font-black"
              >
                Değiştir
              </button>
            </div>
          )}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black">
            3. Hedef Sevk THM
          </span>

          <input
            ref={targetRef}
            name="targetBarcode"
            list="packing-targets"
            value={targetBarcode}
            onChange={(event) => {
              setTargetBarcode(
                event.target.value.toUpperCase(),
              );
              setProductBarcode("");
            }}
            autoComplete="off"
            placeholder={
              selectedDistribution
                ? "Sevk THM barkodunu okut"
                : "Önce dağılım sırası seçin"
            }
            className="w-full rounded-xl border-2 border-slate-300 p-4 font-mono text-xl font-bold uppercase focus:border-cyan-700 focus:outline-none disabled:bg-slate-100"
            disabled={
              isPending ||
              !selectedDistribution
            }
            required
          />

          {selectedTarget && (
            <div className="mt-2 rounded-xl bg-green-50 p-3 text-green-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black">
                    {selectedTarget.packageSequence
                      ? `Koli ${selectedTarget.packageSequence}`
                      : "Yeni Sevk THM"}
                    {" — "}
                    {selectedTarget.unitType}
                  </p>

                  <p className="mt-1 text-sm font-bold">
                    Mevcut miktar:{" "}
                    {selectedTarget.totalQuantity}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={changeTarget}
                  className="rounded-lg border border-green-300 bg-white px-3 py-2 text-xs font-black"
                >
                  Sevk THM Değiştir
                </button>
              </div>

              {selectedTarget.packageSequence && (
                <button
                  type="button"
                  onClick={closeTarget}
                  disabled={
                    isClosing ||
                    isPending
                  }
                  className="mt-3 w-full rounded-xl bg-blue-800 px-4 py-3 font-black text-white disabled:bg-slate-400"
                >
                  {isClosing
                    ? "Kapatılıyor..."
                    : "Koliyi Kapat ve Sevke Hazırla"}
                </button>
              )}
            </div>
          )}

          {selectedDistribution && (
            <p className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold leading-6 text-blue-900">
              Aynı Sevk THM’ye farklı
              SKU’ları ekleyebilirsiniz.
              Koli dolunca kapatıp yeni
              Sevk THM barkodu okutun.
            </p>
          )}
        </label>

        {recommendedProduct && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-950">
            <p className="text-xs font-black uppercase text-orange-700">
              Önerilen Ürün
            </p>

            <p className="mt-2 font-black">
              {recommendedProduct.productCode}
              {" — "}
              {recommendedProduct.productName}
            </p>

            <p className="mt-1 font-mono text-sm">
              {recommendedProduct.productBarcode}
            </p>

            <p className="mt-2 text-sm font-bold">
              Paketlenebilir:{" "}
              {recommendedProduct.availableQuantity}
            </p>
          </div>
        )}

        <label className="block">
          <span className="mb-2 block text-sm font-black">
            4. Ürün Barkodu
          </span>

          <input
            ref={productRef}
            name="productBarcode"
            value={productBarcode}
            onChange={(event) =>
              setProductBarcode(
                event.target.value.toUpperCase(),
              )
            }
            autoComplete="off"
            placeholder="Ürün barkodunu okut"
            className="w-full rounded-xl border-2 border-slate-300 p-4 font-mono text-xl font-bold uppercase focus:border-cyan-700 focus:outline-none disabled:bg-slate-100"
            disabled={
              isPending ||
              !selectedSource ||
              !selectedTarget
            }
            required
          />

          {selectedProduct && (
            <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm font-bold text-slate-800">
              {selectedProduct.productCode}
              {" — "}
              {selectedProduct.productName}
              {" · Paketlenebilir: "}
              {selectedProduct.availableQuantity}
            </p>
          )}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black">
            5. Miktar
          </span>

          <input
            name="quantity"
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(event) =>
              setQuantity(
                event.target.value,
              )
            }
            className="w-full rounded-xl border-2 border-slate-300 p-4 text-xl font-bold focus:border-cyan-700 focus:outline-none disabled:bg-slate-100"
            disabled={
              isPending ||
              !selectedProduct
            }
            required
          />
        </label>

        <button
          type="submit"
          disabled={
            isPending ||
            !selectedDistribution ||
            !selectedSource ||
            !selectedTarget ||
            !selectedProduct
          }
          className="w-full rounded-xl bg-cyan-700 px-5 py-4 text-lg font-black text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isPending
            ? "Paketleniyor..."
            : "Ürünü Sevk THM’ye Aktar"}
        </button>
      </div>
    </form>
  );
}

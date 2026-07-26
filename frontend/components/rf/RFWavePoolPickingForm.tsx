"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  rfWavePoolPickAction,
  type RFWavePoolPickingState,
} from "@/app/rf/wave-picking/actions";

export type WavePoolTaskOption = {
  productId: number;
  productCode: string;
  productBarcode: string;
  productName: string;
  plannedQuantity: number;
  pickedQuantity: number;
  remainingQuantity: number;
};

export type WavePoolOption = {
  id: string;
  waveNo: string;
  statusLabel: string;
  plannedQuantity: number;
  pickedQuantity: number;
  remainingQuantity: number;
  tasks: WavePoolTaskOption[];
};

export type WavePoolTargetOption = {
  barcode: string;
  assignedWaveId: string | null;
  assignedWaveNo: string;
  quantity: number;
};

export type WavePoolSourceOption = {
  barcode: string;
  locationCode: string;
  productId: number;
  productCode: string;
  productBarcode: string;
  productName: string;
  availableQuantity: number;
};

type Props = {
  waves: WavePoolOption[];
  targetUnits: WavePoolTargetOption[];
  sourceUnits: WavePoolSourceOption[];
};

const initialState: RFWavePoolPickingState = {
  success: false,
  message: "",

  waveId: "",
  waveNo: "",

  productId: null,
  productCode: "",
  productName: "",

  sourceBarcode: "",
  targetBarcode: "",

  pickedQuantity: 0,
  sourceQuantityAfter: 0,
  targetQuantityAfter: 0,
  waveRemainingQuantity: 0,

  allocationCount: 0,
  allocationSummary: [],
};

export default function RFWavePoolPickingForm({
  waves,
  targetUnits,
  sourceUnits,
}: Props) {
  const targetInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const sourceInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const productInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const quantityInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const [
    selectedWaveId,
    setSelectedWaveId,
  ] = useState(
    waves[0]?.id ??
      ""
  );

  const [
    targetBarcode,
    setTargetBarcode,
  ] = useState("");

  const [
    selectedProductId,
    setSelectedProductId,
  ] = useState("");

  const [
    sourceBarcode,
    setSourceBarcode,
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
    terminalCode,
    setTerminalCode,
  ] = useState("");

  const [
    localPickedQuantities,
    setLocalPickedQuantities,
  ] = useState<
    Record<
      string,
      number
    >
  >({});

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    rfWavePoolPickAction,
    initialState
  );

  const selectedWave =
    useMemo(
      () =>
        waves.find(
          (wave) =>
            wave.id ===
            selectedWaveId
        ) ?? null,
      [
        waves,
        selectedWaveId,
      ]
    );

  const visibleTasks =
    useMemo(() => {
      if (!selectedWave) {
        return [];
      }

      return selectedWave.tasks
        .map((task) => {
          const additionalPicked =
            localPickedQuantities[
              `${selectedWave.id}:${task.productId}`
            ] ?? 0;

          const pickedQuantity =
            Math.min(
              task.plannedQuantity,
              task.pickedQuantity +
                additionalPicked
            );

          return {
            ...task,
            pickedQuantity,
            remainingQuantity:
              Math.max(
                0,
                task.plannedQuantity -
                  pickedQuantity
              ),
          };
        })
        .sort(
          (left, right) => {
            if (
              left.remainingQuantity ===
                0 &&
              right.remainingQuantity >
                0
            ) {
              return 1;
            }

            if (
              left.remainingQuantity >
                0 &&
              right.remainingQuantity ===
                0
            ) {
              return -1;
            }

            return left.productCode.localeCompare(
              right.productCode,
              "tr"
            );
          }
        );
    }, [
      localPickedQuantities,
      selectedWave,
    ]);

  const selectedTask =
    useMemo(
      () =>
        visibleTasks.find(
          (task) =>
            String(
              task.productId
            ) ===
            selectedProductId
        ) ??
        visibleTasks.find(
          (task) =>
            task.remainingQuantity >
            0
        ) ??
        null,
      [
        selectedProductId,
        visibleTasks,
      ]
    );

  const compatibleTargets =
    useMemo(
      () =>
        targetUnits.filter(
          (unit) =>
            unit.assignedWaveId ===
              null ||
            unit.assignedWaveId ===
              selectedWaveId
        ),
      [
        selectedWaveId,
        targetUnits,
      ]
    );

  const selectedTarget =
    useMemo(
      () =>
        compatibleTargets.find(
          (unit) =>
            unit.barcode ===
            targetBarcode
              .trim()
              .toUpperCase()
        ) ?? null,
      [
        compatibleTargets,
        targetBarcode,
      ]
    );

  const suggestedSources =
    useMemo(() => {
      if (!selectedTask) {
        return [];
      }

      return sourceUnits
        .filter(
          (unit) =>
            unit.productId ===
              selectedTask.productId &&
            unit.availableQuantity >
              0
        )
        .sort(
          (left, right) => {
            const locationDifference =
              left.locationCode.localeCompare(
                right.locationCode,
                "tr"
              );

            if (
              locationDifference !==
              0
            ) {
              return locationDifference;
            }

            return left.barcode.localeCompare(
              right.barcode,
              "tr"
            );
          }
        );
    }, [
      selectedTask,
      sourceUnits,
    ]);

  const localWavePickedQuantity =
    visibleTasks.reduce(
      (
        total,
        task
      ) =>
        total +
        task.pickedQuantity,
      0
    );

  const localWavePlannedQuantity =
    visibleTasks.reduce(
      (
        total,
        task
      ) =>
        total +
        task.plannedQuantity,
      0
    );

  const localWaveRemainingQuantity =
    Math.max(
      0,
      localWavePlannedQuantity -
        localWavePickedQuantity
    );

  const progressPercentage =
    localWavePlannedQuantity >
    0
      ? Math.min(
          100,
          Math.round(
            (
              localWavePickedQuantity /
              localWavePlannedQuantity
            ) * 100
          )
        )
      : 0;

  useEffect(() => {
    const firstTask =
      visibleTasks.find(
        (task) =>
          task.remainingQuantity >
          0
      );

    if (
      !selectedProductId &&
      firstTask
    ) {
      setSelectedProductId(
        String(
          firstTask.productId
        )
      );
    }
  }, [
    selectedProductId,
    visibleTasks,
  ]);

  useEffect(() => {
    if (
      !state.success ||
      !state.productId ||
      !state.waveId
    ) {
      return;
    }

    const key =
      `${state.waveId}:${state.productId}`;

    setLocalPickedQuantities(
      (current) => ({
        ...current,

        [key]:
          (
            current[key] ??
            0
          ) +
          state.pickedQuantity,
      })
    );

    setSourceBarcode("");
    setProductBarcode("");
    setQuantity("1");

    window.setTimeout(
      () => {
        sourceInputRef.current?.focus();
      },
      50
    );
  }, [
    state,
  ]);

  function handleWaveChange(
    waveId: string
  ) {
    setSelectedWaveId(
      waveId
    );

    setTargetBarcode("");
    setSelectedProductId("");
    setSourceBarcode("");
    setProductBarcode("");
    setQuantity("1");

    window.setTimeout(
      () => {
        targetInputRef.current?.focus();
      },
      50
    );
  }

  function clearTargetUnit() {
    setTargetBarcode("");
    setSourceBarcode("");
    setProductBarcode("");
    setQuantity("1");

    window.setTimeout(
      () => {
        targetInputRef.current?.focus();
      },
      50
    );
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
      targetBarcode.trim()
    ) {
      sourceInputRef.current?.focus();
    }
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
      sourceBarcode.trim()
    ) {
      productInputRef.current?.focus();
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
      productBarcode.trim()
    ) {
      quantityInputRef.current?.focus();
      quantityInputRef.current?.select();
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-blue-700">
              Wave Havuz Toplama
            </p>

            <h1 className="mt-2 text-2xl font-black text-slate-950">
              Ortak Toplama THM
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Wave içindeki siparişlerin aynı
              ürünlerini birleştirerek ortak
              Toplama THM&apos;ine aktarın.
              Sipariş ayrımı paketleme
              aşamasında yapılır.
            </p>
          </div>

          {targetBarcode && (
            <button
              type="button"
              onClick={
                clearTargetUnit
              }
              className="rounded-xl bg-red-700 px-4 py-3 text-sm font-black text-white hover:bg-red-800"
            >
              Toplama THM&apos;ini Temizle
            </button>
          )}
        </div>

        {selectedWave && (
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-100 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">
                Wave
              </p>

              <p className="mt-2 font-black text-slate-950">
                {
                  selectedWave.waveNo
                }
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase text-blue-700">
                Planlanan
              </p>

              <p className="mt-2 text-2xl font-black text-blue-950">
                {
                  localWavePlannedQuantity
                }
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase text-emerald-700">
                Toplanan
              </p>

              <p className="mt-2 text-2xl font-black text-emerald-800">
                {
                  localWavePickedQuantity
                }
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase text-amber-700">
                Kalan
              </p>

              <p className="mt-2 text-2xl font-black text-amber-800">
                {
                  localWaveRemainingQuantity
                }
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-800 transition-all"
            style={{
              width:
                `${progressPercentage}%`,
            }}
          />
        </div>

        <p className="mt-2 text-right text-sm font-bold text-slate-600">
          %{progressPercentage}
        </p>
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
              ? "Toplama başarılı"
              : "İşlem tamamlanamadı"}
          </p>

          <p className="mt-2 leading-6">
            {state.message}
          </p>

          {state.success && (
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
              <div className="rounded-xl bg-white/70 p-3">
                <p className="font-bold">
                  Kaynak kalan
                </p>

                <p className="mt-1 text-lg font-black">
                  {
                    state.sourceQuantityAfter
                  }
                </p>
              </div>

              <div className="rounded-xl bg-white/70 p-3">
                <p className="font-bold">
                  Toplama THM toplamı
                </p>

                <p className="mt-1 text-lg font-black">
                  {
                    state.targetQuantityAfter
                  }
                </p>
              </div>

              <div className="rounded-xl bg-white/70 p-3">
                <p className="font-bold">
                  Wave kalan
                </p>

                <p className="mt-1 text-lg font-black">
                  {
                    state.waveRemainingQuantity
                  }
                </p>
              </div>

              <div className="rounded-xl bg-white/70 p-3">
                <p className="font-bold">
                  Dağıtılan sipariş
                </p>

                <p className="mt-1 text-lg font-black">
                  {
                    state.allocationCount
                  }
                </p>
              </div>
            </div>
          )}

          {state.allocationSummary
            .length > 0 && (
            <div className="mt-4 rounded-xl bg-white/70 p-4">
              <p className="text-sm font-black">
                Sistem içi sipariş dağılımı
              </p>

              <ul className="mt-2 space-y-1 text-sm">
                {state.allocationSummary.map(
                  (
                    allocation
                  ) => (
                    <li
                      key={
                        allocation
                      }
                    >
                      • {
                        allocation
                      }
                    </li>
                  )
                )}
              </ul>
            </div>
          )}
        </section>
      )}

      <form
        action={formAction}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <input
          type="hidden"
          name="waveId"
          value={
            selectedWaveId
          }
        />

        <div className="grid gap-5 lg:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-800">
              1. Wave Seçimi
            </span>

            <select
              value={
                selectedWaveId
              }
              onChange={(
                event
              ) =>
                handleWaveChange(
                  event.target
                    .value
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white p-4 font-bold"
              required
            >
              {waves.map(
                (wave) => (
                  <option
                    key={
                      wave.id
                    }
                    value={
                      wave.id
                    }
                  >
                    {
                      wave.waveNo
                    }{" "}
                    — kalan{" "}
                    {
                      wave.remainingQuantity
                    }
                  </option>
                )
              )}
            </select>
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

          <label className="block lg:col-span-2">
            <span className="mb-2 block text-sm font-black text-slate-800">
              2. Ortak Toplama THM
            </span>

            <input
              ref={
                targetInputRef
              }
              name="targetBarcode"
              list="wave-pool-target-options"
              value={
                targetBarcode
              }
              onChange={(
                event
              ) =>
                setTargetBarcode(
                  event.target.value.toUpperCase()
                )
              }
              onKeyDown={
                handleTargetKeyDown
              }
              placeholder="Toplama THM barkodunu okutun"
              autoComplete="off"
              className="w-full rounded-xl border-2 border-blue-300 bg-blue-50 p-4 text-lg font-black uppercase"
              required
            />

            <datalist id="wave-pool-target-options">
              {compatibleTargets.map(
                (unit) => (
                  <option
                    key={
                      unit.barcode
                    }
                    value={
                      unit.barcode
                    }
                  >
                    {unit.assignedWaveNo
                      ? `${unit.assignedWaveNo} — ${unit.quantity} adet`
                      : `Boş Toplama THM — ${unit.quantity} adet`}
                  </option>
                )
              )}
            </datalist>

            {selectedTarget && (
              <p className="mt-2 text-sm font-bold text-blue-800">
                Seçili THM:{" "}
                {
                  selectedTarget.barcode
                }{" "}
                — mevcut{" "}
                {
                  selectedTarget.quantity
                }{" "}
                adet
              </p>
            )}

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Aynı Toplama THM birden fazla
              SKU için sabit kalır. Farklı
              THM&apos;ye geçmek için
              temizleme düğmesini kullanın.
            </p>
          </label>

          <label className="block lg:col-span-2">
            <span className="mb-2 block text-sm font-black text-slate-800">
              3. Toplanacak Wave Ürünü
            </span>

            <select
              value={
                selectedTask
                  ? String(
                      selectedTask.productId
                    )
                  : ""
              }
              onChange={(
                event
              ) => {
                setSelectedProductId(
                  event.target
                    .value
                );

                const task =
                  visibleTasks.find(
                    (
                      item
                    ) =>
                      String(
                        item.productId
                      ) ===
                      event.target
                        .value
                  );

                setProductBarcode(
                  task?.productBarcode ??
                    ""
                );
              }}
              className="w-full rounded-xl border border-slate-300 bg-white p-4 font-bold"
              required
            >
              {visibleTasks.map(
                (task) => (
                  <option
                    key={
                      task.productId
                    }
                    value={
                      task.productId
                    }
                    disabled={
                      task.remainingQuantity ===
                      0
                    }
                  >
                    {
                      task.productCode
                    }{" "}
                    —{" "}
                    {
                      task.productName
                    }{" "}
                    — kalan{" "}
                    {
                      task.remainingQuantity
                    }
                  </option>
                )
              )}
            </select>
          </label>

          {selectedTask && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 lg:col-span-2">
              <p className="font-black text-amber-950">
                {
                  selectedTask.productCode
                }{" "}
                —{" "}
                {
                  selectedTask.productName
                }
              </p>

              <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
                <div>
                  <p className="text-amber-700">
                    Planlanan
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {
                      selectedTask.plannedQuantity
                    }
                  </p>
                </div>

                <div>
                  <p className="text-amber-700">
                    Toplanan
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {
                      selectedTask.pickedQuantity
                    }
                  </p>
                </div>

                <div>
                  <p className="text-amber-700">
                    Kalan
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {
                      selectedTask.remainingQuantity
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          <label className="block lg:col-span-2">
            <span className="mb-2 block text-sm font-black text-slate-800">
              4. Kaynak Stok THM
            </span>

            <input
              ref={
                sourceInputRef
              }
              name="sourceBarcode"
              list="wave-pool-source-options"
              value={
                sourceBarcode
              }
              onChange={(
                event
              ) =>
                setSourceBarcode(
                  event.target.value.toUpperCase()
                )
              }
              onKeyDown={
                handleSourceKeyDown
              }
              placeholder="Kaynak koli veya palet barkodunu okutun"
              autoComplete="off"
              className="w-full rounded-xl border border-slate-300 p-4 text-lg font-black uppercase"
              required
            />

            <datalist id="wave-pool-source-options">
              {suggestedSources.map(
                (unit) => (
                  <option
                    key={`${unit.barcode}:${unit.productId}`}
                    value={
                      unit.barcode
                    }
                  >
                    {
                      unit.locationCode
                    }{" "}
                    —{" "}
                    {
                      unit.availableQuantity
                    }{" "}
                    adet
                  </option>
                )
              )}
            </datalist>

            {suggestedSources.length >
              0 && (
              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-black uppercase text-slate-500">
                  Önerilen ilk kaynak
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  {
                    suggestedSources[0]
                      .locationCode
                  }{" "}
                  /{" "}
                  {
                    suggestedSources[0]
                      .barcode
                  }{" "}
                  /{" "}
                  {
                    suggestedSources[0]
                      .availableQuantity
                  }{" "}
                  adet
                </p>
              </div>
            )}
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-800">
              5. Ürün Barkodu
            </span>

            <input
              ref={
                productInputRef
              }
              name="productBarcode"
              value={
                productBarcode
              }
              onChange={(
                event
              ) =>
                setProductBarcode(
                  event.target.value.toUpperCase()
                )
              }
              onKeyDown={
                handleProductKeyDown
              }
              placeholder="Ürün barkodunu okutun"
              autoComplete="off"
              className="w-full rounded-xl border border-slate-300 p-4 text-lg font-black uppercase"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-800">
              6. Toplama Miktarı
            </span>

            <input
              ref={
                quantityInputRef
              }
              name="quantity"
              type="number"
              min={1}
              max={
                selectedTask
                  ?.remainingQuantity
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
              className="w-full rounded-xl border border-slate-300 p-4 text-lg font-black"
              required
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={
            isPending ||
            !selectedWave ||
            !targetBarcode.trim() ||
            !sourceBarcode.trim() ||
            !productBarcode.trim() ||
            !selectedTask ||
            selectedTask.remainingQuantity ===
              0
          }
          className={`mt-6 w-full rounded-xl py-4 text-lg font-black text-white ${
            isPending
              ? "cursor-not-allowed bg-slate-400"
              : "bg-blue-900 hover:bg-blue-800"
          }`}
        >
          {isPending
            ? "Havuz toplama kaydediliyor..."
            : "Wave Havuz Toplamayı Kaydet"}
        </button>
      </form>
    </div>
  );
}
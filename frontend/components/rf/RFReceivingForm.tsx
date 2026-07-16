"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  rfReceivePurchaseItem,
  type RFReceivingState,
} from "@/app/rf/receiving/actions";

type PurchaseOrderItemOption = {
  id: number;

  productId: number;
  productCode: string;
  productBarcode: string;
  productName: string;

  orderedQuantity: number;
  receivedQuantity: number;
  remainingQuantity: number;

  isActive: boolean;
};

type PurchaseOrderOption = {
  id: number;
  purchaseNumber: string;
  status: string;
  supplierName: string;
  expectedDate: string | null;

  items: PurchaseOrderItemOption[];
};

type HandlingUnitOption = {
  id: number;
  barcode: string;
  unitType: string;
  status: string;

  warehouseCode: string;
  locationCode: string;

  totalQuantity: number;
};

type Props = {
  purchaseOrders: PurchaseOrderOption[];
  handlingUnits: HandlingUnitOption[];
};

const initialState: RFReceivingState = {
  success: false,
  message: "",

  purchaseOrderId: null,
  purchaseNumber: "",

  purchaseOrderItemId: null,

  handlingUnitId: null,
  handlingUnitBarcode: "",

  productId: null,
  productCode: "",
  productBarcode: "",
  productName: "",

  receivedQuantity: 0,
  lineReceivedQuantity: 0,
  lineRemainingQuantity: 0,

  handlingUnitProductQuantity: 0,
  handlingUnitTotalQuantity: 0,

  productPhysicalStock: 0,
  purchaseOrderStatus: "",
};

export default function RFReceivingForm({
  purchaseOrders,
  handlingUnits,
}: Props) {
  const purchaseInputRef =
    useRef<HTMLInputElement>(null);

  const handlingUnitInputRef =
    useRef<HTMLInputElement>(null);

  const productInputRef =
    useRef<HTMLInputElement>(null);

  const quantityInputRef =
    useRef<HTMLInputElement>(null);

  const lastHandledResultRef =
    useRef("");

  const [
    purchaseNumber,
    setPurchaseNumber,
  ] = useState("");

  const [
    handlingUnitBarcode,
    setHandlingUnitBarcode,
  ] = useState("");

  const [
    productBarcode,
    setProductBarcode,
  ] = useState("");

  const [quantity, setQuantity] =
    useState("1");

  const [
    showMessage,
    setShowMessage,
  ] = useState(true);

  const [
    sessionReceiptCount,
    setSessionReceiptCount,
  ] = useState(0);

  const [
    sessionReceivedQuantity,
    setSessionReceivedQuantity,
  ] = useState(0);

  const [
    currentOrderItems,
    setCurrentOrderItems,
  ] = useState<
    Record<
      string,
      PurchaseOrderItemOption[]
    >
  >(() =>
    Object.fromEntries(
      purchaseOrders.map(
        (purchaseOrder) => [
          purchaseOrder.purchaseNumber.toUpperCase(),

          purchaseOrder.items.map(
            (item) => ({
              ...item,
            })
          ),
        ]
      )
    )
  );

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

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    rfReceivePurchaseItem,
    initialState
  );

  const normalizedPurchaseNumber =
    purchaseNumber
      .trim()
      .toUpperCase();

  const normalizedHandlingUnitBarcode =
    handlingUnitBarcode
      .trim()
      .toUpperCase();

  const normalizedProductBarcode =
    productBarcode
      .trim()
      .toUpperCase();

  const selectedPurchaseOrder =
    useMemo(
      () =>
        purchaseOrders.find(
          (purchaseOrder) =>
            purchaseOrder.purchaseNumber
              .trim()
              .toUpperCase() ===
            normalizedPurchaseNumber
        ),
      [
        purchaseOrders,
        normalizedPurchaseNumber,
      ]
    );

  const selectedHandlingUnit =
    useMemo(
      () =>
        handlingUnits.find(
          (unit) =>
            unit.barcode
              .trim()
              .toUpperCase() ===
            normalizedHandlingUnitBarcode
        ),
      [
        handlingUnits,
        normalizedHandlingUnitBarcode,
      ]
    );

  const purchaseOrderItems =
    useMemo(() => {
      if (!normalizedPurchaseNumber) {
        return [];
      }

      return (
        currentOrderItems[
          normalizedPurchaseNumber
        ] ?? []
      ).filter(
        (item) =>
          item.remainingQuantity > 0
      );
    }, [
      currentOrderItems,
      normalizedPurchaseNumber,
    ]);

  const selectedPurchaseItem =
    useMemo(
      () =>
        purchaseOrderItems.find(
          (item) =>
            item.productBarcode
              .trim()
              .toUpperCase() ===
              normalizedProductBarcode ||
            item.productCode
              .trim()
              .toUpperCase() ===
              normalizedProductBarcode
        ),
      [
        purchaseOrderItems,
        normalizedProductBarcode,
      ]
    );

  const handlingUnitTotalQuantity =
    normalizedHandlingUnitBarcode
      ? currentUnitQuantities[
          normalizedHandlingUnitBarcode
        ] ?? 0
      : 0;

  useEffect(() => {
    purchaseInputRef.current?.focus();
  }, []);

  useEffect(() => {
    setCurrentOrderItems(
      Object.fromEntries(
        purchaseOrders.map(
          (purchaseOrder) => [
            purchaseOrder.purchaseNumber.toUpperCase(),

            purchaseOrder.items.map(
              (item) => ({
                ...item,
              })
            ),
          ]
        )
      )
    );
  }, [purchaseOrders]);

  useEffect(() => {
    setCurrentUnitQuantities(
      Object.fromEntries(
        handlingUnits.map((unit) => [
          unit.barcode.toUpperCase(),
          unit.totalQuantity,
        ])
      )
    );
  }, [handlingUnits]);

  useEffect(() => {
    setProductBarcode("");
    setQuantity("1");
  }, [normalizedPurchaseNumber]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    const resultKey = [
      state.purchaseOrderId,
      state.purchaseOrderItemId,
      state.handlingUnitId,
      state.productId,
      state.receivedQuantity,
      state.lineReceivedQuantity,
      state.lineRemainingQuantity,
      state.handlingUnitTotalQuantity,
      state.message,
    ].join("|");

    if (
      lastHandledResultRef.current ===
      resultKey
    ) {
      return;
    }

    lastHandledResultRef.current =
      resultKey;

    setShowMessage(true);

    const orderKey =
      state.purchaseNumber
        .trim()
        .toUpperCase();

    setCurrentOrderItems(
      (current) => {
        const orderItems =
          current[orderKey] ?? [];

        const nextItems =
          orderItems.map((item) => {
            if (
              item.id !==
              state.purchaseOrderItemId
            ) {
              return item;
            }

            return {
              ...item,

              receivedQuantity:
                state.lineReceivedQuantity,

              remainingQuantity:
                state.lineRemainingQuantity,
            };
          });

        return {
          ...current,
          [orderKey]: nextItems,
        };
      }
    );

    const unitKey =
      state.handlingUnitBarcode
        .trim()
        .toUpperCase();

    setCurrentUnitQuantities(
      (current) => ({
        ...current,

        [unitKey]:
          state.handlingUnitTotalQuantity,
      })
    );

    setSessionReceiptCount(
      (current) => current + 1
    );

    setSessionReceivedQuantity(
      (current) =>
        current +
        state.receivedQuantity
    );

    setPurchaseNumber(
      state.purchaseNumber
    );

    setHandlingUnitBarcode(
      state.handlingUnitBarcode
    );

    setProductBarcode("");
    setQuantity("1");

    window.setTimeout(() => {
      productInputRef.current?.focus();
    }, 100);
  }, [
    state.success,
    state.message,
    state.purchaseOrderId,
    state.purchaseNumber,
    state.purchaseOrderItemId,
    state.handlingUnitId,
    state.handlingUnitBarcode,
    state.productId,
    state.receivedQuantity,
    state.lineReceivedQuantity,
    state.lineRemainingQuantity,
    state.handlingUnitTotalQuantity,
  ]);

  function clearForm() {
    setPurchaseNumber("");
    setHandlingUnitBarcode("");
    setProductBarcode("");
    setQuantity("1");

    setSessionReceiptCount(0);
    setSessionReceivedQuantity(0);

    setShowMessage(false);

    window.setTimeout(() => {
      purchaseInputRef.current?.focus();
    }, 100);
  }

  function changePurchaseOrder() {
    setPurchaseNumber("");
    setProductBarcode("");
    setQuantity("1");
    setShowMessage(false);

    window.setTimeout(() => {
      purchaseInputRef.current?.focus();
    }, 100);
  }

  function changeHandlingUnit() {
    setHandlingUnitBarcode("");
    setProductBarcode("");
    setQuantity("1");
    setShowMessage(false);

    window.setTimeout(() => {
      handlingUnitInputRef.current?.focus();
    }, 100);
  }

  function handlePurchaseKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (selectedPurchaseOrder) {
      handlingUnitInputRef.current?.focus();
    }
  }

  function handleHandlingUnitKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (
      selectedPurchaseOrder &&
      selectedHandlingUnit
    ) {
      productInputRef.current?.focus();
    }
  }

  function handleProductKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (selectedPurchaseItem) {
      quantityInputRef.current?.focus();
      quantityInputRef.current?.select();
    }
  }

  function handleQuantityKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (canSubmit) {
      event.currentTarget.form
        ?.requestSubmit();
    }
  }

  const numericQuantity =
    Number(quantity);

  const canSubmit =
    Boolean(selectedPurchaseOrder) &&
    Boolean(selectedHandlingUnit) &&
    Boolean(selectedPurchaseItem) &&
    Number.isInteger(
      numericQuantity
    ) &&
    numericQuantity > 0 &&
    numericQuantity <=
      (selectedPurchaseItem
        ?.remainingQuantity ?? 0);

  return (
    <form
      action={formAction}
      onSubmit={() =>
        setShowMessage(true)
      }
      className="rounded-2xl bg-white p-4 shadow md:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">
            Barkod Akışı
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Sipariş → THM → Ürün → Miktar
          </p>
        </div>

        <button
          type="button"
          onClick={clearForm}
          disabled={isPending}
          className="rounded-xl bg-red-50 px-4 py-3 font-bold text-red-700 disabled:opacity-50"
        >
          Temizle
        </button>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <article className="rounded-xl bg-blue-50 p-3 text-center">
          <p className="text-[10px] font-black uppercase text-blue-700">
            Kalan Kalem
          </p>

          <p className="mt-2 text-2xl font-black text-blue-900">
            {purchaseOrderItems.length}
          </p>
        </article>

        <article className="rounded-xl bg-green-50 p-3 text-center">
          <p className="text-[10px] font-black uppercase text-green-700">
            Kabul İşlemi
          </p>

          <p className="mt-2 text-2xl font-black text-green-900">
            {sessionReceiptCount}
          </p>
        </article>

        <article className="rounded-xl bg-orange-50 p-3 text-center">
          <p className="text-[10px] font-black uppercase text-orange-700">
            Kabul Miktarı
          </p>

          <p className="mt-2 text-2xl font-black text-orange-900">
            {sessionReceivedQuantity.toLocaleString(
              "tr-TR"
            )}
          </p>
        </article>
      </div>

      {showMessage &&
        state.message && (
          <div
            role="alert"
            className={`mt-4 rounded-xl border p-4 ${
              state.success
                ? "border-green-300 bg-green-50 text-green-800"
                : "border-red-300 bg-red-50 text-red-800"
            }`}
          >
            <p className="text-lg font-black">
              {state.success
                ? "✓ Mal Kabul Başarılı"
                : "✕ Mal Kabul Başarısız"}
            </p>

            <p className="mt-2 text-sm leading-6">
              {state.message}
            </p>

            {state.success && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-white/70 p-3">
                  <p className="text-[10px] font-black uppercase">
                    Satır Kalanı
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {
                      state.lineRemainingQuantity
                    }
                  </p>
                </div>

                <div className="rounded-lg bg-white/70 p-3">
                  <p className="text-[10px] font-black uppercase">
                    THM Toplamı
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {
                      state.handlingUnitTotalQuantity
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      <datalist id="rf-purchase-options">
        {purchaseOrders.map(
          (purchaseOrder) => (
            <option
              key={purchaseOrder.id}
              value={
                purchaseOrder.purchaseNumber
              }
            >
              {purchaseOrder.supplierName}
              {" — "}
              {purchaseOrder.status}
            </option>
          )
        )}
      </datalist>

      <datalist id="rf-receiving-unit-options">
        {handlingUnits.map((unit) => (
          <option
            key={unit.id}
            value={unit.barcode}
          >
            {unit.unitType}
            {" — "}
            {unit.status}
            {" — Stok: "}
            {currentUnitQuantities[
              unit.barcode.toUpperCase()
            ] ?? unit.totalQuantity}
          </option>
        ))}
      </datalist>

      <datalist id="rf-purchase-product-options">
        {purchaseOrderItems.map(
          (item) => (
            <option
              key={item.id}
              value={
                item.productBarcode
              }
            >
              {item.productCode}
              {" — "}
              {item.productName}
              {" — Kalan: "}
              {item.remainingQuantity}
            </option>
          )
        )}

        {purchaseOrderItems.map(
          (item) => (
            <option
              key={`code-${item.id}`}
              value={item.productCode}
            >
              {item.productBarcode}
              {" — "}
              {item.productName}
              {" — Kalan: "}
              {item.remainingQuantity}
            </option>
          )
        )}
      </datalist>

      <div className="mt-5 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-black">
            1. Satın Alma Siparişi
          </span>

          <input
            ref={purchaseInputRef}
            name="purchaseNumber"
            list="rf-purchase-options"
            value={purchaseNumber}
            onChange={(event) =>
              setPurchaseNumber(
                event.target.value.toUpperCase()
              )
            }
            onKeyDown={
              handlePurchaseKeyDown
            }
            autoComplete="off"
            placeholder="Sipariş numarasını okut"
            className="w-full rounded-xl border-2 border-slate-300 p-4 font-mono text-xl font-bold uppercase focus:border-blue-700 focus:outline-none"
            disabled={isPending}
            required
          />

          {normalizedPurchaseNumber &&
            !selectedPurchaseOrder && (
              <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
                Mal kabule uygun sipariş
                bulunamadı.
              </p>
            )}

          {selectedPurchaseOrder && (
            <div className="mt-2 flex items-start justify-between gap-3 rounded-xl bg-blue-50 p-3 text-blue-900">
              <div>
                <p className="font-black">
                  {
                    selectedPurchaseOrder.supplierName
                  }
                </p>

                <p className="mt-1 text-sm">
                  {
                    selectedPurchaseOrder.status
                  }
                  {" | "}
                  Kalan ürün kalemi:{" "}
                  {purchaseOrderItems.length}
                </p>
              </div>

              <button
                type="button"
                onClick={changePurchaseOrder}
                disabled={isPending}
                className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-black"
              >
                Değiştir
              </button>
            </div>
          )}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black">
            2. Hedef Koli / Palet
          </span>

          <input
            ref={handlingUnitInputRef}
            name="handlingUnitBarcode"
            list="rf-receiving-unit-options"
            value={handlingUnitBarcode}
            onChange={(event) =>
              setHandlingUnitBarcode(
                event.target.value.toUpperCase()
              )
            }
            onKeyDown={
              handleHandlingUnitKeyDown
            }
            autoComplete="off"
            placeholder={
              selectedPurchaseOrder
                ? "Hedef THM barkodunu okut"
                : "Önce sipariş okut"
            }
            className="w-full rounded-xl border-2 border-slate-300 p-4 font-mono text-xl font-bold uppercase focus:border-blue-700 focus:outline-none disabled:bg-slate-100"
            disabled={
              isPending ||
              !selectedPurchaseOrder
            }
            required
          />

          {normalizedHandlingUnitBarcode &&
            !selectedHandlingUnit && (
              <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
                Kullanılabilir koli veya
                palet bulunamadı.
              </p>
            )}

          {selectedHandlingUnit && (
            <div className="mt-2 flex items-start justify-between gap-3 rounded-xl bg-green-50 p-3 text-green-900">
              <div>
                <p className="font-black">
                  {selectedHandlingUnit.unitType}
                  {" — "}
                  {selectedHandlingUnit.status}
                </p>

                <p className="mt-1 text-sm">
                  Mevcut stok:{" "}
                  {handlingUnitTotalQuantity}
                </p>

                <p className="mt-1 font-mono text-xs">
                  {selectedHandlingUnit.warehouseCode &&
                  selectedHandlingUnit.locationCode
                    ? `${selectedHandlingUnit.warehouseCode}/${selectedHandlingUnit.locationCode}`
                    : "Adreslenmedi"}
                </p>
              </div>

              <button
                type="button"
                onClick={changeHandlingUnit}
                disabled={isPending}
                className="rounded-lg border border-green-300 bg-white px-3 py-2 text-xs font-black"
              >
                Değiştir
              </button>
            </div>
          )}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black">
            3. Ürün Barkodu
          </span>

          <input
            ref={productInputRef}
            name="productBarcode"
            list="rf-purchase-product-options"
            value={productBarcode}
            onChange={(event) =>
              setProductBarcode(
                event.target.value.toUpperCase()
              )
            }
            onKeyDown={
              handleProductKeyDown
            }
            autoComplete="off"
            placeholder={
              selectedPurchaseOrder
                ? "Siparişteki ürünü okut"
                : "Önce sipariş okut"
            }
            className="w-full rounded-xl border-2 border-slate-300 p-4 font-mono text-xl font-bold uppercase focus:border-blue-700 focus:outline-none disabled:bg-slate-100"
            disabled={
              isPending ||
              !selectedPurchaseOrder ||
              !selectedHandlingUnit
            }
            required
          />

          {normalizedProductBarcode &&
            !selectedPurchaseItem && (
              <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
                Ürün bu siparişin kalan
                kalemlerinde bulunmuyor.
              </p>
            )}

          {selectedPurchaseItem && (
            <div className="mt-2 rounded-xl bg-orange-50 p-3 text-orange-900">
              <p className="font-black">
                {
                  selectedPurchaseItem.productCode
                }
                {" — "}
                {
                  selectedPurchaseItem.productName
                }
              </p>

              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white/70 p-2">
                  <p className="text-[9px] font-black uppercase">
                    Sipariş
                  </p>

                  <p className="mt-1 font-black">
                    {
                      selectedPurchaseItem.orderedQuantity
                    }
                  </p>
                </div>

                <div className="rounded-lg bg-white/70 p-2">
                  <p className="text-[9px] font-black uppercase">
                    Kabul
                  </p>

                  <p className="mt-1 font-black">
                    {
                      selectedPurchaseItem.receivedQuantity
                    }
                  </p>
                </div>

                <div className="rounded-lg bg-white/70 p-2">
                  <p className="text-[9px] font-black uppercase">
                    Kalan
                  </p>

                  <p className="mt-1 font-black">
                    {
                      selectedPurchaseItem.remainingQuantity
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black">
            4. Mal Kabul Miktarı
          </span>

          <input
            ref={quantityInputRef}
            name="quantity"
            type="number"
            min="1"
            max={
              selectedPurchaseItem
                ?.remainingQuantity
            }
            step="1"
            value={quantity}
            onChange={(event) =>
              setQuantity(
                event.target.value
              )
            }
            onKeyDown={
              handleQuantityKeyDown
            }
            className="w-full rounded-xl border-2 border-slate-300 p-4 text-2xl font-black focus:border-blue-700 focus:outline-none disabled:bg-slate-100"
            disabled={
              isPending ||
              !selectedPurchaseItem
            }
            required
          />
        </label>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2">
        {[1, 5, 10, 24].map(
          (quickQuantity) => (
            <button
              key={quickQuantity}
              type="button"
              onClick={() =>
                setQuantity(
                  String(
                    Math.min(
                      quickQuantity,
                      selectedPurchaseItem
                        ?.remainingQuantity ??
                        quickQuantity
                    )
                  )
                )
              }
              disabled={
                isPending ||
                !selectedPurchaseItem
              }
              className="rounded-xl border border-slate-300 bg-white py-3 font-black disabled:opacity-40"
            >
              {quickQuantity}
            </button>
          )
        )}
      </div>

      <button
        type="submit"
        disabled={
          isPending || !canSubmit
        }
        className={`mt-6 w-full rounded-xl py-5 text-xl font-black ${
          !isPending && canSubmit
            ? "bg-blue-900 text-white active:bg-blue-950"
            : "cursor-not-allowed bg-slate-300 text-slate-500"
        }`}
      >
        {isPending
          ? "MAL KABUL YAPILIYOR..."
          : "MAL KABULÜ TAMAMLA"}
      </button>
    </form>
  );
}
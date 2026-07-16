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

type ProductOption = {
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
  locationCode: string;
  totalQuantity: number;
  products: ProductOption[];
};

type Props = {
  handlingUnits: HandlingUnitOption[];
};

const initialState:
  HandlingUnitTransferState = {
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

export default function RFHandlingUnitTransferForm({
  handlingUnits,
}: Props) {
  const sourceRef =
    useRef<HTMLInputElement>(null);

  const targetRef =
    useRef<HTMLInputElement>(null);

  const productRef =
    useRef<HTMLInputElement>(null);

  const quantityRef =
    useRef<HTMLInputElement>(null);

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
    showMessage,
    setShowMessage,
  ] = useState(true);

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    transferProductBetweenHandlingUnits,
    initialState
  );

  const normalizedSource =
    sourceBarcode
      .trim()
      .toUpperCase();

  const normalizedTarget =
    targetBarcode
      .trim()
      .toUpperCase();

  const normalizedProduct =
    productBarcode
      .trim()
      .toUpperCase();

  const sourceUnit = useMemo(
    () =>
      handlingUnits.find(
        (unit) =>
          unit.barcode.toUpperCase() ===
          normalizedSource
      ),
    [
      handlingUnits,
      normalizedSource,
    ]
  );

  const targetUnit = useMemo(
    () =>
      handlingUnits.find(
        (unit) =>
          unit.barcode.toUpperCase() ===
          normalizedTarget
      ),
    [
      handlingUnits,
      normalizedTarget,
    ]
  );

  const sourceProducts =
    sourceUnit?.products.filter(
      (product) =>
        product.quantity > 0
    ) ?? [];

  const selectedProduct =
    sourceProducts.find(
      (product) =>
        product.barcode.toUpperCase() ===
          normalizedProduct ||
        product.code.toUpperCase() ===
          normalizedProduct
    );

  useEffect(() => {
    sourceRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    setShowMessage(true);
    setProductBarcode("");
    setQuantity("1");

    window.setTimeout(() => {
      productRef.current?.focus();
    }, 100);
  }, [
    state.success,
    state.message,
  ]);

  function clearForm() {
    setSourceBarcode("");
    setTargetBarcode("");
    setProductBarcode("");
    setQuantity("1");
    setShowMessage(false);

    window.setTimeout(() => {
      sourceRef.current?.focus();
    }, 100);
  }

  function handleSourceKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (sourceUnit) {
      targetRef.current?.focus();
    }
  }

  function handleTargetKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (
      targetUnit &&
      normalizedSource !==
        normalizedTarget
    ) {
      productRef.current?.focus();
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

    if (selectedProduct) {
      quantityRef.current?.focus();
      quantityRef.current?.select();
    }
  }

  const numericQuantity =
    Number(quantity);

  const canSubmit =
    Boolean(sourceUnit) &&
    Boolean(targetUnit) &&
    Boolean(selectedProduct) &&
    normalizedSource !==
      normalizedTarget &&
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
      onSubmit={() =>
        setShowMessage(true)
      }
      className="rounded-2xl bg-white p-4 shadow md:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">
            Barkod Akışı
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Kaynak → Hedef → Ürün → Miktar
          </p>
        </div>

        <button
          type="button"
          onClick={clearForm}
          disabled={isPending}
          className="rounded-xl bg-red-50 px-4 py-3 font-bold text-red-700"
        >
          Temizle
        </button>
      </div>

      {showMessage &&
        state.message && (
          <div
            className={`mt-4 rounded-xl border p-4 ${
              state.success
                ? "border-green-300 bg-green-50 text-green-800"
                : "border-red-300 bg-red-50 text-red-800"
            }`}
          >
            <p className="text-lg font-black">
              {state.success
                ? "✓ İşlem Başarılı"
                : "✕ İşlem Başarısız"}
            </p>

            <p className="mt-2 text-sm leading-6">
              {state.message}
            </p>
          </div>
        )}

      <datalist id="rf-unit-options">
        {handlingUnits.map((unit) => (
          <option
            key={unit.id}
            value={unit.barcode}
          >
            {unit.unitType} —{" "}
            {unit.status} — Stok:{" "}
            {unit.totalQuantity}
          </option>
        ))}
      </datalist>

      <datalist id="rf-source-products">
        {sourceProducts.map(
          (product) => (
            <option
              key={product.itemId}
              value={product.barcode}
            >
              {product.code} —{" "}
              {product.name} —{" "}
              {product.availableQuantity}
            </option>
          )
        )}

        {sourceProducts.map(
          (product) => (
            <option
              key={`code-${product.itemId}`}
              value={product.code}
            >
              {product.barcode} —{" "}
              {product.name}
            </option>
          )
        )}
      </datalist>

      <div className="mt-5 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-black">
            1. Kaynak Koli / Palet
          </span>

          <input
            ref={sourceRef}
            name="sourceBarcode"
            list="rf-unit-options"
            value={sourceBarcode}
            onChange={(event) => {
              setSourceBarcode(
                event.target.value.toUpperCase()
              );

              setProductBarcode("");
              setQuantity("1");
            }}
            onKeyDown={
              handleSourceKeyDown
            }
            autoComplete="off"
            placeholder="Kaynak barkodu okut"
            className="w-full rounded-xl border-2 border-slate-300 p-4 font-mono text-xl font-bold uppercase focus:border-blue-700 focus:outline-none"
            disabled={isPending}
            required
          />

          {sourceUnit && (
            <div className="mt-2 rounded-xl bg-orange-50 p-3 text-sm text-orange-800">
              <p className="font-black">
                {sourceUnit.unitType}
                {" — "}
                {sourceUnit.status}
              </p>

              <p className="mt-1">
                Stok:{" "}
                {sourceUnit.totalQuantity}
                {" | "}
                Ürün çeşidi:{" "}
                {sourceProducts.length}
              </p>

              <p className="mt-1 font-mono">
                {sourceUnit.warehouseCode &&
                sourceUnit.locationCode
                  ? `${sourceUnit.warehouseCode}/${sourceUnit.locationCode}`
                  : "Adreslenmedi"}
              </p>
            </div>
          )}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black">
            2. Hedef Koli / Palet
          </span>

          <input
            ref={targetRef}
            name="targetBarcode"
            list="rf-unit-options"
            value={targetBarcode}
            onChange={(event) =>
              setTargetBarcode(
                event.target.value.toUpperCase()
              )
            }
            onKeyDown={
              handleTargetKeyDown
            }
            autoComplete="off"
            placeholder="Hedef barkodu okut"
            className="w-full rounded-xl border-2 border-slate-300 p-4 font-mono text-xl font-bold uppercase focus:border-blue-700 focus:outline-none"
            disabled={isPending}
            required
          />

          {targetUnit && (
            <div className="mt-2 rounded-xl bg-green-50 p-3 text-sm text-green-800">
              <p className="font-black">
                {targetUnit.unitType}
                {" — "}
                {targetUnit.status}
              </p>

              <p className="mt-1">
                Stok:{" "}
                {targetUnit.totalQuantity}
              </p>

              <p className="mt-1 font-mono">
                {targetUnit.warehouseCode &&
                targetUnit.locationCode
                  ? `${targetUnit.warehouseCode}/${targetUnit.locationCode}`
                  : "Adreslenmedi"}
              </p>
            </div>
          )}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black">
            3. Ürün Barkodu
          </span>

          <input
            ref={productRef}
            name="productBarcode"
            list="rf-source-products"
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
              sourceUnit
                ? "Kaynak içindeki ürünü okut"
                : "Önce kaynak THM okut"
            }
            className="w-full rounded-xl border-2 border-slate-300 p-4 font-mono text-xl font-bold uppercase focus:border-blue-700 focus:outline-none disabled:bg-slate-100"
            disabled={
              isPending ||
              !sourceUnit
            }
            required
          />

          {selectedProduct && (
            <div className="mt-2 rounded-xl bg-blue-50 p-3 text-blue-900">
              <p className="font-black">
                {selectedProduct.code}
              </p>

              <p className="mt-1 text-sm">
                {selectedProduct.name}
              </p>

              <p className="mt-2 text-sm font-bold">
                Kullanılabilir:{" "}
                {
                  selectedProduct.availableQuantity
                }
              </p>
            </div>
          )}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black">
            4. Transfer Miktarı
          </span>

          <input
            ref={quantityRef}
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
            className="w-full rounded-xl border-2 border-slate-300 p-4 text-2xl font-black focus:border-blue-700 focus:outline-none disabled:bg-slate-100"
            disabled={
              isPending ||
              !selectedProduct
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
          ? "TRANSFER YAPILIYOR..."
          : "TRANSFERİ TAMAMLA"}
      </button>
    </form>
  );
}
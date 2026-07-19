"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  rfPickOrderItem,
  type RFPickingState,
} from "@/app/rf/picking/actions";

type OrderItemOption = {
  id: number;
  productId: number;
  productCode: string;
  productBarcode: string;
  productName: string;
  orderedQuantity: number;
  pickedQuantity: number;
  remainingQuantity: number;
  isActive: boolean;
};

type OrderOption = {
  id: number;
  orderNumber: string;
  status: string;
  customerCode: string;
  customerName: string;
  orderDate: string;
  requestedDate: string | null;
  totalQuantity: number;
  pickedQuantity: number;
  remainingQuantity: number;
  items: OrderItemOption[];
};

type SourceProductOption = {
  itemId: number;
  productId: number;
  productCode: string;
  productBarcode: string;
  productName: string;
  quantity: number;
  reservedStock: number;
  availableQuantity: number;
  isActive: boolean;
};

type SourceUnitOption = {
  id: number;
  barcode: string;
  unitType: string;
  status: string;
  warehouseCode: string;
  warehouseName: string;
  locationId: number;
  locationCode: string;
  locationSortOrder: number;
  totalQuantity: number;
  products: SourceProductOption[];
};

type TargetUnitOption = {
  id: number;
  barcode: string;
  unitType: string;
  status: string;

  assignedOrderId: number | null;
  assignedOrderNumber: string;
  assignedCustomerName: string;

  warehouseCode: string;
  locationCode: string;
  totalQuantity: number;
};

type Props = {
  orders: OrderOption[];
  sourceUnits: SourceUnitOption[];
  targetUnits: TargetUnitOption[];
};

const initialState: RFPickingState = {
  success: false,
  message: "",

  orderId: null,
  orderNumber: "",
  orderStatus: "",

  orderItemId: null,

  productId: null,
  productCode: "",
  productBarcode: "",
  productName: "",

  sourceUnitId: null,
  sourceBarcode: "",
  sourceQuantityAfter: 0,

  targetUnitId: null,
  targetBarcode: "",
  targetQuantityAfter: 0,

  pickedQuantity: 0,
  linePickedQuantity: 0,
  lineRemainingQuantity: 0,

  orderPickedQuantity: 0,
  orderTotalQuantity: 0,
  orderRemainingQuantity: 0,
  progressPercentage: 0,

  pickingCompleted: false,
};

export default function RFPickingForm({
  orders,
  sourceUnits,
  targetUnits,
}: Props) {
  const orderInputRef =
    useRef<HTMLInputElement>(null);

  const targetInputRef =
    useRef<HTMLInputElement>(null);

  const locationInputRef =
    useRef<HTMLInputElement>(null);

  const sourceInputRef =
    useRef<HTMLInputElement>(null);

  const productInputRef =
    useRef<HTMLInputElement>(null);

  const quantityInputRef =
    useRef<HTMLInputElement>(null);

  const lastHandledResultRef =
    useRef("");

  const lastSuccessfulSourceIdRef =
    useRef<number | null>(null);

  const awaitingNextPickRef =
    useRef(false);

  const [
    orderNumber,
    setOrderNumber,
  ] = useState("");

  const [
    targetBarcode,
    setTargetBarcode,
  ] = useState("");

  const [
    locationBarcode,
    setLocationBarcode,
  ] = useState("");

  const [
    sourceBarcode,
    setSourceBarcode,
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
    sessionPickCount,
    setSessionPickCount,
  ] = useState(0);

  const [
    sessionPickedQuantity,
    setSessionPickedQuantity,
  ] = useState(0);

  const [
    currentOrderItems,
    setCurrentOrderItems,
  ] = useState<
    Record<string, OrderItemOption[]>
  >(() =>
    Object.fromEntries(
      orders.map((order) => [
        order.orderNumber.toUpperCase(),

        order.items.map((item) => ({
          ...item,
        })),
      ])
    )
  );

  const [
    currentSourceProducts,
    setCurrentSourceProducts,
  ] = useState<
    Record<
      string,
      SourceProductOption[]
    >
  >(() =>
    Object.fromEntries(
      sourceUnits.map((unit) => [
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
    currentTargetQuantities,
    setCurrentTargetQuantities,
  ] = useState<Record<string, number>>(
    () =>
      Object.fromEntries(
        targetUnits.map((unit) => [
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
    rfPickOrderItem,
    initialState
  );

  const normalizedOrderNumber =
    orderNumber
      .trim()
      .toUpperCase();

  const normalizedTargetBarcode =
    targetBarcode
      .trim()
      .toUpperCase();

  const normalizedLocationBarcode =
    locationBarcode
      .trim()
      .toUpperCase();

  const normalizedSourceBarcode =
    sourceBarcode
      .trim()
      .toUpperCase();

  const normalizedProductBarcode =
    productBarcode
      .trim()
      .toUpperCase();

  const selectedOrder =
    useMemo(
      () =>
        orders.find(
          (order) =>
            order.orderNumber
              .trim()
              .toUpperCase() ===
            normalizedOrderNumber
        ),
      [
        orders,
        normalizedOrderNumber,
      ]
    );

    const availableTargetUnits =
  useMemo(() => {
    if (!selectedOrder) {
      return [];
    }

    return targetUnits.filter(
      (unit) =>
        unit.assignedOrderId === null ||
        unit.assignedOrderId ===
          selectedOrder.id
    );
  }, [
    targetUnits,
    selectedOrder,
  ]);

  const selectedTargetUnit =
  useMemo(
    () =>
      availableTargetUnits.find(
        (unit) =>
          unit.barcode
            .trim()
            .toUpperCase() ===
          normalizedTargetBarcode
      ),
    [
      availableTargetUnits,
      normalizedTargetBarcode,
    ]
  );

  const pendingOrderItems =
    useMemo(() => {
      if (!normalizedOrderNumber) {
        return [];
      }

      return (
        currentOrderItems[
          normalizedOrderNumber
        ] ?? []
      ).filter(
        (item) =>
          item.remainingQuantity > 0
      );
    }, [
      currentOrderItems,
      normalizedOrderNumber,
    ]);

  const nextOrderItem =
    pendingOrderItems[0] ?? null;

  const recommendedSources =
    useMemo(() => {
      if (!nextOrderItem) {
        return [];
      }

      return sourceUnits
        .map((unit) => {
          const currentProducts =
            currentSourceProducts[
              unit.barcode.toUpperCase()
            ] ?? [];

          const matchingProduct =
            currentProducts.find(
              (product) =>
                product.productId ===
                  nextOrderItem.productId &&
                product.quantity > 0 &&
                product.availableQuantity >
                  0 &&
                product.isActive
            );

          if (!matchingProduct) {
            return null;
          }

          return {
            unit,
            product:
              matchingProduct,
          };
        })
        .filter(
          (
            item
          ): item is {
            unit: SourceUnitOption;
            product: SourceProductOption;
          } => item !== null
        )
        .sort(
          (first, second) => {
            if (
              first.unit
                .locationSortOrder !==
              second.unit
                .locationSortOrder
            ) {
              return (
                first.unit
                  .locationSortOrder -
                second.unit
                  .locationSortOrder
              );
            }

            const locationCompare =
              first.unit.locationCode.localeCompare(
                second.unit.locationCode,
                "tr"
              );

            if (
              locationCompare !== 0
            ) {
              return locationCompare;
            }

            return first.unit.barcode.localeCompare(
              second.unit.barcode,
              "tr"
            );
          }
        );
    }, [
      nextOrderItem,
      sourceUnits,
      currentSourceProducts,
    ]);

  const recommendedSource =
    recommendedSources[0] ?? null;

  const selectedSourceUnit =
    useMemo(
      () =>
        sourceUnits.find(
          (unit) =>
            unit.barcode
              .trim()
              .toUpperCase() ===
            normalizedSourceBarcode
        ),
      [
        sourceUnits,
        normalizedSourceBarcode,
      ]
    );

  const selectedSourceProduct =
    useMemo(() => {
      if (
        !selectedSourceUnit ||
        !nextOrderItem
      ) {
        return undefined;
      }

      return (
        currentSourceProducts[
          selectedSourceUnit.barcode.toUpperCase()
        ] ?? []
      ).find(
        (product) =>
          product.productId ===
          nextOrderItem.productId
      );
    }, [
      selectedSourceUnit,
      nextOrderItem,
      currentSourceProducts,
    ]);

  const expectedLocationCode =
    recommendedSource?.unit
      .locationCode ?? "";

  const expectedSourceBarcode =
    recommendedSource?.unit
      .barcode ?? "";

  const expectedProductBarcode =
    nextOrderItem
      ?.productBarcode ?? "";

  const targetTotalQuantity =
    normalizedTargetBarcode
      ? currentTargetQuantities[
          normalizedTargetBarcode
        ] ?? 0
      : 0;

  const orderItems =
    normalizedOrderNumber
      ? currentOrderItems[
          normalizedOrderNumber
        ] ?? []
      : [];

  const orderTotalQuantity =
    orderItems.reduce(
      (total, item) =>
        total +
        item.orderedQuantity,
      0
    );

  const orderPickedQuantity =
    orderItems.reduce(
      (total, item) =>
        total +
        Math.min(
          item.pickedQuantity,
          item.orderedQuantity
        ),
      0
    );

  const orderRemainingQuantity =
    Math.max(
      0,
      orderTotalQuantity -
        orderPickedQuantity
    );

  const progressPercentage =
    orderTotalQuantity > 0
      ? Math.min(
          100,
          Math.round(
            (
              orderPickedQuantity /
              orderTotalQuantity
            ) * 100
          )
        )
      : 0;

  const maximumPickQuantity =
    Math.min(
      nextOrderItem
        ?.remainingQuantity ?? 0,

      selectedSourceProduct
        ?.availableQuantity ?? 0
    );

  const numericQuantity =
    Number(quantity);

  const locationMatches =
    Boolean(expectedLocationCode) &&
    normalizedLocationBarcode ===
      expectedLocationCode
        .trim()
        .toUpperCase();

  const sourceMatches =
    Boolean(expectedSourceBarcode) &&
    normalizedSourceBarcode ===
      expectedSourceBarcode
        .trim()
        .toUpperCase();

  const productMatches =
    Boolean(nextOrderItem) &&
    (
      normalizedProductBarcode ===
        nextOrderItem?.productBarcode
          .trim()
          .toUpperCase() ||
      normalizedProductBarcode ===
        nextOrderItem?.productCode
          .trim()
          .toUpperCase()
    );

  const canSubmit =
    Boolean(selectedOrder) &&
    Boolean(selectedTargetUnit) &&
    Boolean(nextOrderItem) &&
    Boolean(recommendedSource) &&
    Boolean(selectedSourceUnit) &&
    Boolean(selectedSourceProduct) &&
    locationMatches &&
    sourceMatches &&
    productMatches &&
    normalizedSourceBarcode !==
      normalizedTargetBarcode &&
    Number.isInteger(
      numericQuantity
    ) &&
    numericQuantity > 0 &&
    numericQuantity <=
      maximumPickQuantity;

  useEffect(() => {
    orderInputRef.current?.focus();
  }, []);

  useEffect(() => {
    setCurrentOrderItems(
      Object.fromEntries(
        orders.map((order) => [
          order.orderNumber.toUpperCase(),

          order.items.map(
            (item) => ({
              ...item,
            })
          ),
        ])
      )
    );
  }, [orders]);

  useEffect(() => {
    setCurrentSourceProducts(
      Object.fromEntries(
        sourceUnits.map((unit) => [
          unit.barcode.toUpperCase(),

          unit.products.map(
            (product) => ({
              ...product,
            })
          ),
        ])
      )
    );
  }, [sourceUnits]);

  useEffect(() => {
    setCurrentTargetQuantities(
      Object.fromEntries(
        targetUnits.map((unit) => [
          unit.barcode.toUpperCase(),
          unit.totalQuantity,
        ])
      )
    );
  }, [targetUnits]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    const resultKey = [
      state.orderId,
      state.orderItemId,
      state.productId,
      state.sourceUnitId,
      state.targetUnitId,
      state.pickedQuantity,
      state.sourceQuantityAfter,
      state.targetQuantityAfter,
      state.pickedQuantity,
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

    lastSuccessfulSourceIdRef.current =
      state.sourceUnitId;

    awaitingNextPickRef.current =
      true;

    setShowMessage(true);

    const orderKey =
      state.orderNumber
        .trim()
        .toUpperCase();

    setCurrentOrderItems(
      (current) => {
        const currentItems =
          current[orderKey] ?? [];

        return {
          ...current,

          [orderKey]:
            currentItems.map(
              (item) => {
                if (
                  item.id !==
                  state.orderItemId
                ) {
                  return item;
                }

                return {
                  ...item,

                  pickedQuantity:
                    state.linePickedQuantity,

                  remainingQuantity:
                    state.lineRemainingQuantity,
                };
              }
            ),
        };
      }
    );

    const sourceKey =
      state.sourceBarcode
        .trim()
        .toUpperCase();

    setCurrentSourceProducts(
      (current) => {
        const products =
          current[sourceKey] ?? [];

        return {
          ...current,

          [sourceKey]:
            products
              .map((product) => {
                if (
                  product.productId !==
                  state.productId
                ) {
                  return product;
                }

                const nextQuantity =
                  state.sourceQuantityAfter;

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
              ),
        };
      }
    );

    const targetKey =
      state.targetBarcode
        .trim()
        .toUpperCase();

    setCurrentTargetQuantities(
      (current) => ({
        ...current,

        [targetKey]:
          state.targetQuantityAfter,
      })
    );

    setSessionPickCount(
      (current) =>
        current + 1
    );

    setSessionPickedQuantity(
      (current) =>
        current +
        state.pickedQuantity
    );

    /*
     * Sipariş ve hedef toplama THM'si
     * seri toplama sırasında korunur.
     */
    setOrderNumber(
      state.orderNumber
    );

    setTargetBarcode(
      state.targetBarcode
    );

    /*
     * Lokasyon ve kaynak THM burada
     * temizlenmez.
     *
     * Sonraki useEffect, sıradaki ürünün
     * bulunduğu yere göre karar verir.
     */
    setProductBarcode("");
    setQuantity("1");
  }, [
    state.success,
    state.message,
    state.orderId,
    state.orderNumber,
    state.orderItemId,
    state.productId,
    state.sourceUnitId,
    state.sourceBarcode,
    state.sourceQuantityAfter,
    state.targetUnitId,
    state.targetBarcode,
    state.targetQuantityAfter,
    state.pickedQuantity,
    state.linePickedQuantity,
    state.lineRemainingQuantity,
    state.pickedQuantity,
  ]);

  /*
   * Başarılı toplama sonrasında sıradaki
   * ürünün kaynağını kontrol eder.
   */
  useEffect(() => {
    if (
      !awaitingNextPickRef.current
    ) {
      return;
    }

    /*
     * Sipariş tamamlandıysa kaynak
     * seçimlerini temizler.
     */
    if (!nextOrderItem) {
      awaitingNextPickRef.current =
        false;

      lastSuccessfulSourceIdRef.current =
        null;

      setLocationBarcode("");
      setSourceBarcode("");
      setProductBarcode("");
      setQuantity("1");

      window.setTimeout(() => {
        orderInputRef.current?.focus();
      }, 100);

      return;
    }

    const previousSourceUnit =
      sourceUnits.find(
        (unit) =>
          unit.id ===
          lastSuccessfulSourceIdRef.current
      );

    const previousSourceProducts =
      previousSourceUnit
        ? currentSourceProducts[
            previousSourceUnit.barcode.toUpperCase()
          ] ?? []
        : [];

    /*
     * Önceki THM içerisinde sıradaki
     * ürün bulunuyorsa lokasyon ve THM
     * seçili kalır.
     */
    const previousSourceHasNextProduct =
      previousSourceProducts.some(
        (product) =>
          product.productId ===
            nextOrderItem.productId &&
          product.availableQuantity > 0
      );

    if (
      previousSourceUnit &&
      previousSourceHasNextProduct
    ) {
      awaitingNextPickRef.current =
        false;

      setLocationBarcode(
        previousSourceUnit.locationCode
      );

      setSourceBarcode(
        previousSourceUnit.barcode
      );

      setProductBarcode("");
      setQuantity("1");

      window.setTimeout(() => {
        productInputRef.current?.focus();
      }, 100);

      return;
    }

    /*
     * Sıradaki ürün aynı lokasyondaki
     * başka THM'deyse lokasyon seçili
     * kalır, kaynak THM temizlenir.
     */
    if (
      previousSourceUnit &&
      recommendedSource &&
      recommendedSource.unit.locationCode
        .trim()
        .toUpperCase() ===
        previousSourceUnit.locationCode
          .trim()
          .toUpperCase()
    ) {
      awaitingNextPickRef.current =
        false;

      setLocationBarcode(
        previousSourceUnit.locationCode
      );

      setSourceBarcode("");
      setProductBarcode("");
      setQuantity("1");

      window.setTimeout(() => {
        sourceInputRef.current?.focus();
      }, 100);

      return;
    }

    /*
     * Sıradaki ürün başka lokasyondaysa
     * lokasyon ve kaynak THM temizlenir.
     */
    awaitingNextPickRef.current =
      false;

    setLocationBarcode("");
    setSourceBarcode("");
    setProductBarcode("");
    setQuantity("1");

    window.setTimeout(() => {
      locationInputRef.current?.focus();
    }, 100);
  }, [
    nextOrderItem,
    recommendedSource,
    currentSourceProducts,
    sourceUnits,
  ]);

  function clearForm() {
    lastSuccessfulSourceIdRef.current =
      null;

    awaitingNextPickRef.current =
      false;

    setOrderNumber("");
    setTargetBarcode("");
    setLocationBarcode("");
    setSourceBarcode("");
    setProductBarcode("");
    setQuantity("1");

    setSessionPickCount(0);
    setSessionPickedQuantity(0);

    setShowMessage(false);

    window.setTimeout(() => {
      orderInputRef.current?.focus();
    }, 100);
  }

  function changeOrder() {
    lastSuccessfulSourceIdRef.current =
      null;

    awaitingNextPickRef.current =
      false;

    setOrderNumber("");
    setLocationBarcode("");
    setSourceBarcode("");
    setProductBarcode("");
    setQuantity("1");

    setShowMessage(false);

    window.setTimeout(() => {
      orderInputRef.current?.focus();
    }, 100);
  }

  function changeTarget() {
    setTargetBarcode("");
    setProductBarcode("");
    setQuantity("1");

    setShowMessage(false);

    window.setTimeout(() => {
      targetInputRef.current?.focus();
    }, 100);
  }

  function handleOrderChange(
    value: string
  ) {
    lastSuccessfulSourceIdRef.current =
      null;

    awaitingNextPickRef.current =
      false;

    setOrderNumber(
      value.toUpperCase()
    );

    setLocationBarcode("");
    setSourceBarcode("");
    setProductBarcode("");
    setQuantity("1");
  }

  function handleOrderKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (selectedOrder) {
      targetInputRef.current?.focus();
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

    if (selectedTargetUnit) {
      /*
       * Lokasyon zaten doğru şekilde
       * seçiliyse kaynak veya ürün alanına
       * geçilebilir.
       */
      if (
        locationMatches &&
        sourceMatches
      ) {
        productInputRef.current?.focus();
        return;
      }

      if (locationMatches) {
        sourceInputRef.current?.focus();
        return;
      }

      locationInputRef.current?.focus();
    }
  }

  function handleLocationKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (locationMatches) {
      sourceInputRef.current?.focus();
    }
  }

  function handleSourceKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (sourceMatches) {
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

    if (productMatches) {
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
            Sipariş → Hedef THM → Lokasyon
            → Kaynak THM → Ürün → Miktar
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

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-black uppercase text-slate-500">
            Sipariş İlerlemesi
          </p>

          <p className="text-sm font-black text-blue-900">
            %{progressPercentage}
          </p>
        </div>

        <div className="mt-2 h-4 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-900 transition-all"
            style={{
              width: `${progressPercentage}%`,
            }}
          />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <article className="rounded-xl bg-blue-50 p-3 text-center">
            <p className="text-[10px] font-black uppercase text-blue-700">
              Sipariş
            </p>

            <p className="mt-2 text-2xl font-black text-blue-900">
              {orderTotalQuantity}
            </p>
          </article>

          <article className="rounded-xl bg-green-50 p-3 text-center">
            <p className="text-[10px] font-black uppercase text-green-700">
              Toplandı
            </p>

            <p className="mt-2 text-2xl font-black text-green-900">
              {orderPickedQuantity}
            </p>
          </article>

          <article className="rounded-xl bg-orange-50 p-3 text-center">
            <p className="text-[10px] font-black uppercase text-orange-700">
              Kalan
            </p>

            <p className="mt-2 text-2xl font-black text-orange-900">
              {orderRemainingQuantity}
            </p>
          </article>
        </div>
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
                ? state.pickingCompleted
                  ? "✓ Toplama Tamamlandı"
                  : "✓ Ürün Toplandı"
                : "✕ Toplama Başarısız"}
            </p>

            <p className="mt-2 text-sm leading-6">
              {state.message}
            </p>

            {state.success && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-white/70 p-3">
                  <p className="text-[10px] font-black uppercase">
                    Sipariş Kalanı
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {
                      state.orderRemainingQuantity
                    }
                  </p>
                </div>

                <div className="rounded-lg bg-white/70 p-3">
                  <p className="text-[10px] font-black uppercase">
                    Durum
                  </p>

                  <p className="mt-1 font-black">
                    {state.orderStatus}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      <datalist id="rf-picking-order-options">
        {orders.map((order) => (
          <option
            key={order.id}
            value={order.orderNumber}
          >
            {order.customerCode}
            {" — "}
            {order.customerName}
            {" — Kalan: "}
            {order.remainingQuantity}
          </option>
        ))}
      </datalist>

      <datalist id="rf-picking-target-options">
        {availableTargetUnits.map(
  (unit) => (
          <option
            key={unit.id}
            value={unit.barcode}
          >
            {unit.unitType}
            {" — "}
            {unit.status}
            {" — Stok: "}
            {currentTargetQuantities[
              unit.barcode.toUpperCase()
            ] ?? unit.totalQuantity}
          </option>
        ))}
      </datalist>

      <div className="mt-5 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-black">
            1. Sipariş Numarası
          </span>

          <input
            ref={orderInputRef}
            name="orderNumber"
            list="rf-picking-order-options"
            value={orderNumber}
            onChange={(event) =>
              handleOrderChange(
                event.target.value
              )
            }
            onKeyDown={
              handleOrderKeyDown
            }
            autoComplete="off"
            placeholder="Sipariş numarasını okut"
            className="w-full rounded-xl border-2 border-slate-300 p-4 font-mono text-xl font-bold uppercase focus:border-blue-700 focus:outline-none"
            disabled={isPending}
            required
          />

          {normalizedOrderNumber &&
            !selectedOrder && (
              <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
                Toplamaya uygun sipariş
                bulunamadı.
              </p>
            )}

          {selectedOrder && (
            <div className="mt-2 flex items-start justify-between gap-3 rounded-xl bg-blue-50 p-3 text-blue-900">
              <div>
                <p className="font-black">
                  {selectedOrder.customerCode}
                  {" — "}
                  {selectedOrder.customerName}
                </p>

                <p className="mt-1 text-sm">
                  Durum:{" "}
                  {selectedOrder.status}
                  {" | "}
                  Kalan kalem:{" "}
                  {pendingOrderItems.length}
                </p>
              </div>

              <button
                type="button"
                onClick={changeOrder}
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
            2. Hedef Toplama Koli / Paleti
          </span>

          <input
            ref={targetInputRef}
            name="targetBarcode"
            list="rf-picking-target-options"
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
            placeholder={
              selectedOrder
                ? "Hedef toplama THM'sini okut"
                : "Önce sipariş okut"
            }
            className="w-full rounded-xl border-2 border-slate-300 p-4 font-mono text-xl font-bold uppercase focus:border-blue-700 focus:outline-none disabled:bg-slate-100"
            disabled={
              isPending ||
              !selectedOrder
            }
            required
          />

          {normalizedTargetBarcode &&
            !selectedTargetUnit && (
              <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
                Kullanılabilir hedef taşıma
                birimi bulunamadı.
              </p>
            )}

          {selectedTargetUnit && (
            <div className="mt-2 flex items-start justify-between gap-3 rounded-xl bg-green-50 p-3 text-green-900">
              <div>
                <p className="font-black">
                  {selectedTargetUnit.unitType}
                  {" — "}
                  {selectedTargetUnit.status}
                </p>

                <p className="mt-1 text-sm">
                  Hedef stok:{" "}
                  {targetTotalQuantity}
                </p>
                {selectedTargetUnit.assignedOrderId ? (
  <p className="mt-2 text-sm font-bold">
    Bağlı sipariş:{" "}
    {
      selectedTargetUnit.assignedOrderNumber
    }
    {" — "}
    {
      selectedTargetUnit.assignedCustomerName
    }
  </p>
) : (
  <p className="mt-2 text-sm font-bold">
    Boş toplama THM’si — ilk işlemde
    bu siparişe bağlanacak.
  </p>
)}


              </div>

              <button
                type="button"
                onClick={changeTarget}
                disabled={isPending}
                className="rounded-lg border border-green-300 bg-white px-3 py-2 text-xs font-black"
              >
                Değiştir
              </button>
            </div>
          )}
        </label>

        {nextOrderItem && (
          <div className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-4 text-blue-950">
            <p className="text-xs font-black uppercase tracking-wider text-blue-600">
              Sıradaki Ürün
            </p>

            <p className="mt-2 text-xl font-black">
              {nextOrderItem.productCode}
            </p>

            <p className="mt-1 font-bold">
              {nextOrderItem.productName}
            </p>

            <p className="mt-2 font-mono text-sm">
              {nextOrderItem.productBarcode}
            </p>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-white/70 p-2">
                <p className="text-[9px] font-black uppercase">
                  Sipariş
                </p>

                <p className="mt-1 font-black">
                  {
                    nextOrderItem.orderedQuantity
                  }
                </p>
              </div>

              <div className="rounded-lg bg-white/70 p-2">
                <p className="text-[9px] font-black uppercase">
                  Toplandı
                </p>

                <p className="mt-1 font-black">
                  {
                    nextOrderItem.pickedQuantity
                  }
                </p>
              </div>

              <div className="rounded-lg bg-white/70 p-2">
                <p className="text-[9px] font-black uppercase">
                  Kalan
                </p>

                <p className="mt-1 font-black">
                  {
                    nextOrderItem.remainingQuantity
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {nextOrderItem &&
          !recommendedSource && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">
              <p className="font-black">
                Kaynak stok bulunamadı
              </p>

              <p className="mt-2 text-sm leading-6">
                Bu ürün için adreslenmiş ve
                kullanılabilir kaynak
                koli/palet stoğu bulunmuyor.
              </p>
            </div>
          )}

        {recommendedSource && (
          <div className="rounded-2xl border border-orange-300 bg-orange-50 p-4 text-orange-950">
            <p className="text-xs font-black uppercase tracking-wider text-orange-700">
              Önerilen Kaynak
            </p>

            <p className="mt-2 font-mono text-xl font-black">
              {
                recommendedSource.unit
                  .locationCode
              }
            </p>

            <p className="mt-2 font-mono font-black">
              {
                recommendedSource.unit
                  .barcode
              }
            </p>

            <p className="mt-2 text-sm">
              Kullanılabilir miktar:{" "}
              <strong>
                {
                  recommendedSource
                    .product
                    .availableQuantity
                }
              </strong>
            </p>
          </div>
        )}

        <label className="block">
          <span className="mb-2 block text-sm font-black">
            3. Kaynak Lokasyon
          </span>

          <input
            ref={locationInputRef}
            name="locationBarcode"
            value={locationBarcode}
            onChange={(event) =>
              setLocationBarcode(
                event.target.value.toUpperCase()
              )
            }
            onKeyDown={
              handleLocationKeyDown
            }
            autoComplete="off"
            placeholder={
              recommendedSource
                ? "Önerilen lokasyonu okut"
                : "Kaynak lokasyon bekleniyor"
            }
            className="w-full rounded-xl border-2 border-slate-300 p-4 font-mono text-xl font-bold uppercase focus:border-blue-700 focus:outline-none disabled:bg-slate-100"
            disabled={
              isPending ||
              !selectedTargetUnit ||
              !recommendedSource
            }
            required
          />

          {normalizedLocationBarcode &&
            !locationMatches && (
              <div className="mt-2 rounded-xl bg-red-600 p-4 text-white">
                <p className="font-black">
                  Yanlış Lokasyon
                </p>

                <p className="mt-2 text-sm">
                  Beklenen:{" "}
                  <strong>
                    {expectedLocationCode}
                  </strong>
                </p>

                <p className="mt-1 text-sm">
                  Okutulan:{" "}
                  <strong>
                    {
                      normalizedLocationBarcode
                    }
                  </strong>
                </p>
              </div>
            )}

          {locationMatches && (
            <p className="mt-2 rounded-lg bg-green-50 p-3 text-sm font-bold text-green-700">
              Doğru lokasyon seçildi.
            </p>
          )}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black">
            4. Kaynak Koli / Palet
          </span>

          <input
            ref={sourceInputRef}
            name="sourceBarcode"
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
            placeholder={
              locationMatches
                ? "Önerilen kaynak THM'yi okut"
                : "Önce doğru lokasyonu okut"
            }
            className="w-full rounded-xl border-2 border-slate-300 p-4 font-mono text-xl font-bold uppercase focus:border-blue-700 focus:outline-none disabled:bg-slate-100"
            disabled={
              isPending ||
              !locationMatches
            }
            required
          />

          {normalizedSourceBarcode &&
            !sourceMatches && (
              <div className="mt-2 rounded-xl bg-red-600 p-4 text-white">
                <p className="font-black">
                  Yanlış Kaynak THM
                </p>

                <p className="mt-2 text-sm">
                  Beklenen:{" "}
                  <strong>
                    {expectedSourceBarcode}
                  </strong>
                </p>

                <p className="mt-1 text-sm">
                  Okutulan:{" "}
                  <strong>
                    {
                      normalizedSourceBarcode
                    }
                  </strong>
                </p>
              </div>
            )}

          {sourceMatches &&
            selectedSourceProduct && (
              <div className="mt-2 rounded-xl bg-orange-50 p-3 text-orange-900">
                <p className="font-black">
                  Kaynak THM seçildi
                </p>

                <p className="mt-1 font-mono text-sm">
                  {normalizedSourceBarcode}
                </p>

                <p className="mt-1 text-sm">
                  Kullanılabilir stok:{" "}
                  {
                    selectedSourceProduct.availableQuantity
                  }
                </p>
              </div>
            )}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black">
            5. Ürün Barkodu
          </span>

          <input
            ref={productInputRef}
            name="productBarcode"
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
              sourceMatches
                ? "Ürün barkodunu okut"
                : "Önce doğru kaynak THM'yi okut"
            }
            className="w-full rounded-xl border-2 border-slate-300 p-4 font-mono text-xl font-bold uppercase focus:border-blue-700 focus:outline-none disabled:bg-slate-100"
            disabled={
              isPending ||
              !sourceMatches
            }
            required
          />

          {normalizedProductBarcode &&
            !productMatches && (
              <div className="mt-2 rounded-xl bg-red-600 p-4 text-white">
                <p className="font-black">
                  Yanlış Ürün
                </p>

                <p className="mt-2 text-sm">
                  Beklenen:{" "}
                  <strong>
                    {expectedProductBarcode}
                  </strong>
                </p>

                <p className="mt-1 text-sm">
                  Okutulan:{" "}
                  <strong>
                    {
                      normalizedProductBarcode
                    }
                  </strong>
                </p>
              </div>
            )}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black">
            6. Toplama Miktarı
          </span>

          <input
            ref={quantityInputRef}
            name="quantity"
            type="number"
            min="1"
            max={maximumPickQuantity}
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
              !productMatches
            }
            required
          />

          {productMatches && (
            <p className="mt-2 text-sm font-bold text-slate-600">
              En fazla{" "}
              {maximumPickQuantity} adet
              toplanabilir.
            </p>
          )}
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
                      maximumPickQuantity
                    )
                  )
                )
              }
              disabled={
                isPending ||
                !productMatches ||
                maximumPickQuantity <= 0
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
          ? "ÜRÜN TOPLANIYOR..."
          : "TOPLAMAYI KAYDET"}
      </button>

      <p className="mt-4 text-center text-xs font-semibold text-slate-400">
        Bu oturumda işlem:{" "}
        {sessionPickCount}
        {" | "}
        Toplanan:{" "}
        {sessionPickedQuantity}
      </p>
    </form>
  );
}
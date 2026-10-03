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
  rfMarkPickingProductLost,
  rfClosePickingShortage,
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
  flowType:
    | "DIRECT_ORDER"
    | "WAVE";
  waveId: string | null;
  waveNo: string | null;
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
  purpose:
    | "PICKING"
    | "SHIPPING";
  status: string;

  assignedOrderId: number | null;
  assignedWaveId: string | null;
  assignedOrderNumber: string;
  assignedCustomerName: string;
  assignedWaveNo: string;
  shippingStatus:
    | "OPEN"
    | "CLOSED"
    | "READY_TO_SHIP"
    | "SHIPPED"
    | "CANCELLED"
    | null;
  packageSequence: number | null;

  warehouseCode: string;
  locationCode: string;
  totalQuantity: number;
};

type Props = {
  orders: OrderOption[];
  sourceUnits: SourceUnitOption[];
  targetUnits: TargetUnitOption[];
  lockedOrderNumber?: string;
  zoneTaskId?: string;
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
  taskCompleted: false,
};

export default function RFPickingForm({
  orders,
  sourceUnits,
  targetUnits,
  lockedOrderNumber,
  zoneTaskId,
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

  const lastHandledResultRef =
    useRef("");

  const lastSuccessfulSourceIdRef =
    useRef<number | null>(null);

  const awaitingNextPickRef =
    useRef(false);

  const [
    orderNumber,
    setOrderNumber,
] = useState(() => lockedOrderNumber?.toUpperCase() ?? "");

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


  const [lostPending, setLostPending] = useState(false);
  const [lostMessage, setLostMessage] = useState("");
  const [shortageOpen, setShortageOpen] = useState(false);
  const [shortageReason, setShortageReason] = useState("NOT_FOUND");
  const [shortageNote, setShortageNote] = useState("");
  const [shortagePending, setShortagePending] = useState(false);
  const [shortageMessage, setShortageMessage] = useState("");

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

  const isWaveFlow =
    selectedOrder?.flowType ===
    "WAVE";

  const targetPurposeLabel =
    isWaveFlow
      ? "Toplama THM"
      : "Sevk THM";

  const availableTargetUnits =
    useMemo(() => {
      if (!selectedOrder) {
        return [];
      }

      if (
        selectedOrder.flowType ===
        "WAVE"
      ) {
        return targetUnits.filter(
          (unit) =>
            unit.purpose ===
              "PICKING" &&
            unit.assignedOrderId ===
              null &&
            (
              unit.assignedWaveId ===
                selectedOrder.waveId ||
              (
                unit.assignedWaveId ===
                  null &&
                unit.totalQuantity === 0
              )
            )
        );
      }

      return targetUnits.filter(
        (unit) =>
          unit.purpose ===
            "SHIPPING" &&
          unit.assignedWaveId ===
            null &&
          (
            (
              unit.assignedOrderId ===
                null &&
              unit.totalQuantity === 0 &&
              unit.shippingStatus ===
                null
            ) ||
            (
              unit.assignedOrderId ===
                selectedOrder.id &&
              unit.shippingStatus ===
                "OPEN"
            )
          )
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
                (
                  zoneTaskId
                    ? product.reservedStock > 0
                    : product.availableQuantity > 0
                ) &&
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
      zoneTaskId,
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

      zoneTaskId
        ? Math.min(
            selectedSourceProduct?.quantity ?? 0,
            selectedSourceProduct?.reservedStock ?? 0
          )
        : selectedSourceProduct?.availableQuantity ?? 0
    );

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
    maximumPickQuantity > 0;

  useEffect(() => {
    if (lockedOrderNumber) targetInputRef.current?.focus();
    else orderInputRef.current?.focus();
  }, [lockedOrderNumber]);

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
          (zoneTaskId ? product.reservedStock > 0 : product.availableQuantity > 0)
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
    setTargetBarcode("");
    setLocationBarcode("");
    setSourceBarcode("");
    setProductBarcode("");

    setShowMessage(false);

    window.setTimeout(() => {
      orderInputRef.current?.focus();
    }, 100);
  }

  function changeTarget() {
    setTargetBarcode("");
    setProductBarcode("");

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

    setTargetBarcode("");
    setLocationBarcode("");
    setSourceBarcode("");
    setProductBarcode("");
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
    } else {
      setLocationBarcode("");
      window.setTimeout(() => locationInputRef.current?.focus(), 50);
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
    } else {
      setSourceBarcode("");
      window.setTimeout(() => sourceInputRef.current?.focus(), 50);
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

    if (productMatches && !isPending && canSubmit) {
      event.currentTarget.form?.requestSubmit();
    } else if (!productMatches) {
      setProductBarcode("");
      window.setTimeout(() => productInputRef.current?.focus(), 50);
    }
  }

  async function handleLostProduct() {
    if (!selectedOrder || !recommendedSource || !nextOrderItem) return;
    if (zoneTaskId) {
      setLostMessage("Zone görevinde eksik/kayıp stok otomatik olarak düşülmez. Görev planını bozmamak için yönetici istisna işlemi gerekir.");
      return;
    }

    const lostQuantity = recommendedSource.product.quantity;
    const confirmed = window.confirm(
      `${nextOrderItem.productCode} - ${nextOrderItem.productName}\n\n` +
      `Kaynak THM: ${recommendedSource.unit.barcode}\n` +
      `Kayıp olacak miktar: ${lostQuantity} adet\n\n` +
      "Bu işlem sipariş miktarını değil, bu THM içindeki ilgili ürünün TÜM fiziksel miktarını KYP001 kayıp deposuna aktarır. Devam edilsin mi?"
    );
    if (!confirmed) return;

    setLostPending(true);
    setLostMessage("");
    try {
      const data = new FormData();
      data.set("orderNumber", selectedOrder.orderNumber);
      data.set("sourceBarcode", recommendedSource.unit.barcode);
      data.set("productId", String(nextOrderItem.productId));
      const result = await rfMarkPickingProductLost(data);

      setLostMessage(
        result.shortfall > 0
          ? `${result.productCode}: ${result.lostQuantity} adet kayıp depoya alındı. Alternatif stok sipariş ihtiyacının tamamını karşılamıyor; ${result.shortfall} adet eksik kaldı.`
          : `${result.productCode}: ${result.lostQuantity} adet kayıp depoya alındı. Alternatif kaynak yeniden hesaplandı.`
      );

      setLocationBarcode("");
      setSourceBarcode("");
      setProductBarcode("");
        window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      setLostMessage(error instanceof Error ? error.message : "Kayıp stok işlemi başarısız.");
    } finally {
      setLostPending(false);
    }
  }

  async function handleCloseShortage() {
    if (!selectedOrder || !nextOrderItem) return;
    const missing = nextOrderItem.remainingQuantity;
    if (missing <= 0) return;
    if (!window.confirm(`${nextOrderItem.productCode} için kalan ${missing} adet eksik kapatılsın mı? Bu miktar sevk edilmeyecek.`)) return;

    setShortagePending(true);
    setShortageMessage("");
    try {
      const data = new FormData();
      data.set("orderNumber", selectedOrder.orderNumber);
      data.set("orderItemId", String(nextOrderItem.id));
      data.set("reason", shortageReason);
      data.set("note", shortageNote);
      if (zoneTaskId) data.set("zoneTaskId", zoneTaskId);
      const result = await rfClosePickingShortage(data);
      setShortageMessage(`${result.productCode}: ${result.shortage} adet eksik kapatıldı.`);
      setShortageOpen(false);
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setShortageMessage(error instanceof Error ? error.message : "Eksik toplama kapatılamadı.");
    } finally {
      setShortagePending(false);
    }
  }

  return (
    <form action={formAction} onSubmit={() => setShowMessage(true)} className="bg-white p-2 sm:rounded-xl sm:p-3 sm:shadow">
      {zoneTaskId && <input type="hidden" name="zoneTaskId" value={zoneTaskId} />}

      <div className="mb-2 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 text-xs font-black">
            <span className="truncate">
              {selectedOrder
                ? (isWaveFlow ? selectedOrder.waveNo ?? "WAVE" : selectedOrder.orderNumber) + " · " + selectedOrder.customerName
                : "RF TOPLAMA"}
            </span>
            <span className="shrink-0 text-blue-900">{orderPickedQuantity}/{orderTotalQuantity}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-blue-900 transition-all" style={{ width: String(progressPercentage) + "%" }} />
          </div>
        </div>
        <button type="button" onClick={clearForm} disabled={isPending} className="shrink-0 rounded-lg border border-red-200 px-2 py-1.5 text-xs font-black text-red-700 disabled:opacity-50">
          TEMİZLE
        </button>
      </div>

      {showMessage && state.message && (
        <div role="alert" className={"mb-2 rounded-lg px-3 py-2 text-sm font-bold " + (state.success ? "bg-green-100 text-green-900" : "bg-red-600 text-white")}>
          {state.success
            ? state.pickingCompleted
              ? "✓ Toplama tamamlandı"
              : "✓ 1 adet toplandı · Kalan " + state.orderRemainingQuantity
            : "✕ " + state.message}
        </div>
      )}

      {zoneTaskId && state.success && state.taskCompleted && (
        <div className="mb-2 rounded-xl border-2 border-green-500 bg-green-50 p-3">
          <p className="font-black text-green-950">✓ Görev tamamlandı</p>
          <a href="/rf/picking" className="mt-2 block w-full rounded-lg bg-green-700 px-3 py-3 text-center font-black text-white">
            ONAYLA · LİSTEYE DÖN
          </a>
        </div>
      )}

      <div className="grid gap-2">
        {!lockedOrderNumber && (
          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase text-slate-500">1 · Sipariş</span>
            <input
              ref={orderInputRef}
              name="orderNumber"
              value={orderNumber}
              onChange={(event) => handleOrderChange(event.target.value)}
              onKeyDown={handleOrderKeyDown}
              autoComplete="off"
              placeholder="Sipariş okut"
              className="w-full rounded-lg border-2 border-slate-300 px-3 py-2.5 font-mono text-lg font-black uppercase focus:border-blue-700 focus:outline-none"
              disabled={isPending}
              required
            />
            {normalizedOrderNumber && !selectedOrder && (
              <p className="mt-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white">Sipariş uygun değil.</p>
            )}
          </label>
        )}

        {lockedOrderNumber && selectedOrder && (
          <>
            <input type="hidden" name="orderNumber" value={selectedOrder.orderNumber} />
            <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-sm">
              <span className="min-w-0 truncate font-black">
                {isWaveFlow ? selectedOrder.waveNo : selectedOrder.orderNumber} · {selectedOrder.customerName}
              </span>
              <span className="ml-2 shrink-0 font-black text-blue-900">{pendingOrderItems.length} kalem</span>
            </div>
          </>
        )}

        <label className="block">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-[11px] font-black uppercase text-slate-500">2 · {targetPurposeLabel}</span>
            {selectedTargetUnit && (
              <button type="button" onClick={changeTarget} disabled={isPending} className="text-[11px] font-black text-blue-800">DEĞİŞTİR</button>
            )}
          </div>
          <input
            ref={targetInputRef}
            name="targetBarcode"
            value={targetBarcode}
            onChange={(event) => setTargetBarcode(event.target.value.toUpperCase())}
            onKeyDown={handleTargetKeyDown}
            autoComplete="off"
            placeholder={selectedOrder ? targetPurposeLabel + " okut" : "Önce sipariş okut"}
            className="w-full rounded-lg border-2 border-slate-300 px-3 py-2.5 font-mono text-lg font-black uppercase focus:border-blue-700 focus:outline-none disabled:bg-slate-100"
            disabled={isPending || !selectedOrder}
            required
          />
          {normalizedTargetBarcode && !selectedTargetUnit && (
            <p className="mt-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white">Uygun {targetPurposeLabel} değil.</p>
          )}
        </label>

        {nextOrderItem && recommendedSource && (
          <div className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border-2 border-blue-700 bg-blue-50 p-2.5">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase text-blue-700">GİT / AL</p>
              <p className="truncate font-mono text-xl font-black text-blue-950">{recommendedSource.unit.locationCode}</p>
              <p className="truncate font-mono text-sm font-black text-slate-700">{recommendedSource.unit.barcode}</p>
            </div>
            <div className="min-w-[70px] rounded-lg bg-white px-2 py-1 text-center">
              <p className="text-[9px] font-black uppercase text-slate-500">Kalan</p>
              <p className="text-3xl font-black text-orange-700">{nextOrderItem.remainingQuantity}</p>
            </div>
            <div className="col-span-2 border-t border-blue-200 pt-2">
              <p className="truncate text-base font-black text-slate-950">{nextOrderItem.productCode} · {nextOrderItem.productName}</p>
              <p className="truncate font-mono text-xs font-bold text-slate-600">{nextOrderItem.productBarcode}</p>
            </div>
          </div>
        )}

        {nextOrderItem && !recommendedSource && (
          <div className="rounded-lg bg-red-600 px-3 py-2 text-sm font-black text-white">Kaynak stok bulunamadı · {nextOrderItem.productCode}</div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">3 · Lokasyon</span>
            <input
              ref={locationInputRef}
              name="locationBarcode"
              value={locationBarcode}
              onChange={(event) => setLocationBarcode(event.target.value.toUpperCase())}
              onKeyDown={handleLocationKeyDown}
              autoComplete="off"
              placeholder="Lokasyon okut"
              className="w-full min-w-0 rounded-lg border-2 border-slate-300 px-2 py-2.5 font-mono text-base font-black uppercase focus:border-blue-700 focus:outline-none disabled:bg-slate-100"
              disabled={isPending || !selectedTargetUnit || !recommendedSource}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">4 · Kaynak THM</span>
            <input
              ref={sourceInputRef}
              name="sourceBarcode"
              value={sourceBarcode}
              onChange={(event) => setSourceBarcode(event.target.value.toUpperCase())}
              onKeyDown={handleSourceKeyDown}
              autoComplete="off"
              placeholder="THM okut"
              className="w-full min-w-0 rounded-lg border-2 border-slate-300 px-2 py-2.5 font-mono text-base font-black uppercase focus:border-blue-700 focus:outline-none disabled:bg-slate-100"
              disabled={isPending || !locationMatches}
              required
            />
          </label>
        </div>

        {normalizedLocationBarcode && !locationMatches && (
          <div className="rounded-lg bg-red-600 px-3 py-2 text-sm font-black text-white">YANLIŞ LOKASYON · Beklenen {expectedLocationCode}</div>
        )}

        {normalizedSourceBarcode && !sourceMatches && (
          <div className="rounded-lg bg-red-600 px-3 py-2 text-sm font-black text-white">YANLIŞ THM · Beklenen {expectedSourceBarcode}</div>
        )}

        <label className="block">
          <span className="mb-1 block text-[11px] font-black uppercase text-slate-500">5 · Ürün · Her okutma 1 adet</span>
          <input
            ref={productInputRef}
            name="productBarcode"
            value={productBarcode}
            onChange={(event) => setProductBarcode(event.target.value.toUpperCase())}
            onKeyDown={handleProductKeyDown}
            autoComplete="off"
            placeholder={sourceMatches ? "ÜRÜNÜ OKUT" : "Önce lokasyon ve THM okut"}
            className="w-full rounded-lg border-2 border-blue-700 px-3 py-3 font-mono text-xl font-black uppercase focus:outline-none disabled:border-slate-300 disabled:bg-slate-100"
            disabled={isPending || !sourceMatches}
            required
          />
          {normalizedProductBarcode && !productMatches && (
            <div className="mt-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-black text-white">YANLIŞ ÜRÜN · Beklenen {expectedProductBarcode}</div>
          )}
        </label>

        <input type="hidden" name="quantity" value="1" />

        <button
          type="submit"
          disabled={isPending || !canSubmit}
          className={"w-full rounded-lg py-3 text-base font-black " + (!isPending && canSubmit ? "bg-blue-900 text-white active:bg-blue-950" : "bg-slate-200 text-slate-400")}
        >
          {isPending ? "TOPLANIYOR..." : "ÜRÜNÜ OKUT"}
        </button>

        {selectedOrder && nextOrderItem && (
          <div>
            <button type="button" onClick={() => setShortageOpen((value) => !value)} className="w-full rounded-lg border border-amber-400 bg-amber-50 py-2 text-xs font-black text-amber-900">
              ÜRÜN YOK / EKSİK İŞLEM
            </button>
            {shortageOpen && (
              <div className="mt-2 grid gap-2 rounded-lg bg-amber-50 p-2">
                <select value={shortageReason} onChange={(event) => setShortageReason(event.target.value)} className="rounded-lg border border-amber-300 bg-white p-2 text-sm font-bold">
                  <option value="NOT_FOUND">Ürün Bulunamadı</option>
                  <option value="DAMAGED">Hasarlı Ürün</option>
                  <option value="STOCK_DIFFERENCE">Stok Farkı</option>
                  <option value="QUALITY_REJECTED">Kalite Reddi</option>
                  <option value="OTHER">Diğer</option>
                </select>
                <input value={shortageNote} onChange={(event) => setShortageNote(event.target.value)} placeholder="Açıklama (opsiyonel)" className="rounded-lg border border-amber-300 bg-white p-2 text-sm" />
                <button type="button" disabled={shortagePending} onClick={handleCloseShortage} className="rounded-lg bg-red-700 px-3 py-2 font-black text-white disabled:opacity-50">
                  {shortagePending ? "İşleniyor..." : "Kalan " + nextOrderItem.remainingQuantity + " Adedi Eksik Kapat"}
                </button>
              </div>
            )}
            {shortageMessage && <p className="mt-1 rounded-lg bg-amber-100 p-2 text-xs font-bold text-amber-900">{shortageMessage}</p>}
          </div>
        )}

        {!zoneTaskId && selectedOrder && recommendedSource && nextOrderItem && (
          <button type="button" onClick={handleLostProduct} disabled={isPending || lostPending} className="w-full rounded-lg border border-red-300 py-2 text-xs font-black text-red-700 disabled:opacity-40">
            {lostPending ? "KAYIP İŞLENİYOR..." : "FİZİKSEL STOK KAYIP"}
          </button>
        )}

        {lostMessage && <div className="rounded-lg bg-orange-50 p-2 text-xs font-bold text-orange-900">{lostMessage}</div>}

        <p className="text-center text-[10px] font-semibold text-slate-400">Oturum: {sessionPickCount} işlem · {sessionPickedQuantity} adet</p>
      </div>
    </form>
  );
}

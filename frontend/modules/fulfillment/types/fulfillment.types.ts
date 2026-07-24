import type { OrderFulfillmentFlow } from "@prisma/client";

export type FulfillmentActor = {
  userId: string;
  displayName: string;
  terminalCode?: string | null;
};

export type ResolvedPickingFlow = {
  flowType: OrderFulfillmentFlow;
  waveId: string | null;
  waveNo: string | null;
};

export type DirectShippingUnitInput = {
  orderId: number;
  targetBarcode: string;
  actor: FulfillmentActor;
};

export type WavePickingUnitInput = {
  waveId: string;
  targetBarcode: string;
};

export type DirectShippingItemInput = {
  shippingHandlingUnitId: string;
  orderId: number;
  orderItemId: number;
  productId: number;
  quantity: number;
};

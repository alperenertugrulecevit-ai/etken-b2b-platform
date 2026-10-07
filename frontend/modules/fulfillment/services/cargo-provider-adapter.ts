import "server-only";

export type CargoCreateShipmentInput = {
  orderNumber: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  city: string;
  district: string;
  packageCount: number;
};

export type CargoCreateShipmentResult = {
  trackingNumber: string;
  trackingUrl?: string | null;
  externalShipmentId?: string | null;
};

export type CargoStatusResult = {
  trackingNumber: string;
  status: string;
  deliveredAt?: Date | null;
  raw?: unknown;
};

export interface CargoProviderAdapter {
  provider: string;
  createShipment(input: CargoCreateShipmentInput): Promise<CargoCreateShipmentResult>;
  getStatus(trackingNumber: string): Promise<CargoStatusResult>;
  cancelShipment?(trackingNumber: string): Promise<void>;
}

export function buildTrackingUrl(template: string | null | undefined, trackingNumber: string) {
  if (!template) return null;
  if (!template.includes("{trackingNumber}")) throw new Error("Kargo takip URL şablonu {trackingNumber} içermelidir.");
  return template.replace("{trackingNumber}", encodeURIComponent(trackingNumber));
}

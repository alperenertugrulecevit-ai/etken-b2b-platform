import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";

export const B2B_LEGAL_POLICY = {
  version: "1.0",
  effectiveDate: "02.08.2026",
  deliveryRegion: "İstanbul Avrupa Yakası",
  standardDeliveryTime: "1-3 iş günü",
  workingHours: "Hafta içi 08:00-17:30",
  minimumOrderNetAmount: B2B_CONSTANTS.MINIMUM_ORDER_NET_AMOUNT,
  voluntaryReturnDays: 7,
  apparentDefectNoticeDays: 2,
  inspectionDays: 8,
  jurisdiction: "İstanbul Bakırköy Mahkemeleri ve İcra Daireleri",
} as const;

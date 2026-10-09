import "server-only";

import { B2BPaymentMethod } from "@prisma/client";

export type EcommerceNotificationEvent =
  | "ORDER_RECEIVED"
  | "PAYMENT_CONFIRMED"
  | "CANCELLATION_REQUESTED"
  | "CANCELLED"
  | "SHIPPED"
  | "DELIVERED"
  | "RETURN_REQUESTED"
  | "RETURN_CANCELLED"
  | "REFUNDED";

export type EcommerceNotificationInput = {
  event: EcommerceNotificationEvent;
  email: string | null | undefined;
  orderNumber: string;
  paymentMethod?: B2BPaymentMethod | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  returnNumber?: string | null;
  refundContext?: "ORDER_CANCELLATION" | "PRODUCT_RETURN";
};

export type EcommerceNotificationResult =
  | { status: "sent" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

const SUBJECTS: Record<EcommerceNotificationEvent,string> = {
  ORDER_RECEIVED: "Siparişiniz alındı",
  PAYMENT_CONFIRMED: "Ödemeniz onaylandı",
  CANCELLATION_REQUESTED: "Sipariş iptal talebiniz alındı",
  CANCELLED: "Siparişiniz iptal edildi",
  SHIPPED: "Siparişiniz sevk edildi",
  DELIVERED: "Siparişiniz teslim edildi",
  RETURN_REQUESTED: "Ürün iade talebiniz alındı",
  RETURN_CANCELLED: "Ürün iade talebiniz iptal edildi",
  REFUNDED: "Ödemeniz iade edildi",
};

function paymentName(method:B2BPaymentMethod|null|undefined) {
  if(method===B2BPaymentMethod.BANK_TRANSFER) return "Havale / EFT";
  if(method===B2BPaymentMethod.CREDIT_CARD) return "Kredi / Banka Kartı";
  if(method===B2BPaymentMethod.CURRENT_ACCOUNT) return "Cari Hesap";
  return "Ödeme";
}

function message(input:EcommerceNotificationInput) {
  const tracking = input.trackingNumber
    ? `\nKargo takip numarası: ${input.trackingNumber}${input.trackingUrl ? `\nTakip: ${input.trackingUrl}` : ""}`
    : "";
  const returnInfo = input.returnNumber ? `\nİade numarası: ${input.returnNumber}` : "";
  const payment = paymentName(input.paymentMethod);
  const body:Record<EcommerceNotificationEvent,string> = {
    ORDER_RECEIVED: input.paymentMethod===B2BPaymentMethod.BANK_TRANSFER
      ? "Siparişiniz sisteme alındı. Havale / EFT ödemeniz doğrulandıktan ve stok kontrolü tamamlandıktan sonra hazırlık başlayacaktır."
      : input.paymentMethod===B2BPaymentMethod.CURRENT_ACCOUNT
        ? "Siparişiniz sisteme alındı. Cari hesap ve stok kontrollerinin ardından hazırlık başlayacaktır."
        : input.paymentMethod===B2BPaymentMethod.CREDIT_CARD
          ? "Siparişiniz sisteme alındı. Ödeme ve stok kontrollerinin ardından hazırlık başlayacaktır."
          : "Siparişiniz sisteme alındı. Gerekli kontrollerin ardından hazırlık başlayacaktır.",
    PAYMENT_CONFIRMED: `${payment} ödemeniz onaylandı.`,
    CANCELLATION_REQUESTED: "Sipariş iptal talebiniz alındı. Toplanmış ürünlerin stok geri alma işlemi tamamlandıktan sonra iptal sonuçlandırılacaktır.",
    CANCELLED: "Siparişiniz iptal edildi. Ödeme alınmışsa para iadesi süreci ayrıca tamamlanacaktır.",
    SHIPPED: "Siparişiniz sevk edildi." + tracking,
    DELIVERED: "Siparişiniz teslim edildi.",
    RETURN_REQUESTED: "Ürün iade talebiniz alındı. Kargo/depo kabul süreci bekleniyor." + returnInfo,
    RETURN_CANCELLED: "Ürün iade talebiniz iptal edildi." + returnInfo,
    REFUNDED: input.refundContext==="ORDER_CANCELLATION"
      ? "İptal edilen siparişinizin ödeme iadesi tamamlandı."
      : "Ürün iadenize ait para iadesi tamamlandı." + returnInfo,
  };
  return `Sipariş: ${input.orderNumber}\n\n${body[input.event]}\n\nETKEN Ofis`;
}

export class EcommerceNotificationService {
  static async send(input:EcommerceNotificationInput):Promise<EcommerceNotificationResult> {
    const email=input.email?.trim().toLowerCase();
    if(!email) return {status:"skipped",reason:"Müşteri e-posta adresi yok."};
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {status:"failed",reason:"Müşteri e-posta adresi geçersiz."};
    }
    if (!input.orderNumber?.trim() || input.orderNumber.length > 120 ||
        !Object.prototype.hasOwnProperty.call(SUBJECTS, input.event)) {
      return {status:"failed",reason:"Bildirim olayı veya sipariş numarası geçersiz."};
    }

    const webhook=process.env.ECOMMERCE_EMAIL_WEBHOOK_URL?.trim();
    if(!webhook) return {status:"skipped",reason:"E-posta sağlayıcısı yapılandırılmadı."};
    // Never send customer addresses or bearer tokens over plaintext transport.
    let providerUrl: URL;
    try {
      providerUrl = new URL(webhook);
    } catch {
      return {status:"failed",reason:"E-posta sağlayıcısı adresi geçersiz."};
    }
    if (providerUrl.protocol !== "https:" || providerUrl.username || providerUrl.password) {
      return {status:"failed",reason:"E-posta sağlayıcısı HTTPS kullanmalı ve URL kimlik bilgisi içermemelidir."};
    }


    try {
      const response=await fetch(webhook,{
        method:"POST",
        redirect:"error",
        headers:{
          "content-type":"application/json",
          ...(process.env.ECOMMERCE_EMAIL_WEBHOOK_TOKEN
            ? {"authorization":`Bearer ${process.env.ECOMMERCE_EMAIL_WEBHOOK_TOKEN}`}
            : {}),
        },
        body:JSON.stringify({
          to:email,
          subject:`${SUBJECTS[input.event]} · ${input.orderNumber}`,
          text:message(input),
          event:input.event,
          orderNumber:input.orderNumber,
        }),
        signal:AbortSignal.timeout(8000),
      });
      if(!response.ok) return {status:"failed",reason:`E-posta sağlayıcısı HTTP ${response.status} döndürdü.`};
      return {status:"sent"};
    } catch(error) {
      return {status:"failed",reason:error instanceof Error?error.message:"E-posta gönderilemedi."};
    }
  }
}

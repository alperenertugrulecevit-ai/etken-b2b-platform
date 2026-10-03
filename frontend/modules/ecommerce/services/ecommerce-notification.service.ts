import "server-only";

export type EcommerceNotificationEvent =
  | "ORDER_RECEIVED"
  | "PAYMENT_CONFIRMED"
  | "SHIPPED"
  | "DELIVERED"
  | "REFUNDED";

export type EcommerceNotificationInput = {
  event: EcommerceNotificationEvent;
  email: string | null | undefined;
  orderNumber: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
};

export type EcommerceNotificationResult =
  | { status: "sent" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

const SUBJECTS: Record<EcommerceNotificationEvent,string> = {
  ORDER_RECEIVED: "Siparişiniz alındı",
  PAYMENT_CONFIRMED: "Ödemeniz onaylandı",
  SHIPPED: "Siparişiniz sevk edildi",
  DELIVERED: "Siparişiniz teslim edildi",
  REFUNDED: "Ödemeniz iade edildi",
};

function message(input:EcommerceNotificationInput) {
  const tracking = input.trackingNumber
    ? `\nKargo takip numarası: ${input.trackingNumber}${input.trackingUrl ? `\nTakip: ${input.trackingUrl}` : ""}`
    : "";
  const body:Record<EcommerceNotificationEvent,string> = {
    ORDER_RECEIVED: "Siparişiniz sisteme alındı. Havale / EFT ve stok kontrolü sonrasında hazırlık başlayacaktır.",
    PAYMENT_CONFIRMED: "Havale / EFT ödemeniz onaylandı.",
    SHIPPED: "Siparişiniz sevk edildi." + tracking,
    DELIVERED: "Siparişiniz teslim edildi.",
    REFUNDED: "İptal edilen siparişinizin ödeme iadesi kaydedildi.",
  };
  return `Sipariş: ${input.orderNumber}\n\n${body[input.event]}\n\nETKEN Ofis`;
}

export class EcommerceNotificationService {
  static async send(input:EcommerceNotificationInput):Promise<EcommerceNotificationResult> {
    const email=input.email?.trim().toLowerCase();
    if(!email) return {status:"skipped",reason:"Müşteri e-posta adresi yok."};

    const webhook=process.env.ECOMMERCE_EMAIL_WEBHOOK_URL?.trim();
    if(!webhook) return {status:"skipped",reason:"E-posta sağlayıcısı yapılandırılmadı."};

    try {
      const response=await fetch(webhook,{
        method:"POST",
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

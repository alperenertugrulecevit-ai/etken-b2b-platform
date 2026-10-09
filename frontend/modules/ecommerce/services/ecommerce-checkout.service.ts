import "server-only";

import {
  B2BPaymentMethod,
  CustomerAccountEntryDirection,
  CustomerAccountEntryType,
  CustomerType,
  OrderSource,
  OrderStatus,
  OrderType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";
import { EcommerceNotificationService } from "@/modules/ecommerce/services/ecommerce-notification.service";

export type EcommerceCheckoutInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postalCode: string | null;
  shippingAddressId?: number | null;
  invoiceSameAsShipping?: boolean;
  invoiceAddressId?: number | null;
  invoiceAddress?: string | null;
  invoiceCity?: string | null;
  invoiceDistrict?: string | null;
  invoicePostalCode?: string | null;
  invoiceType: "INDIVIDUAL" | "CORPORATE";
  invoiceName: string;
  invoiceTaxOffice: string | null;
  invoiceTaxNumber: string | null;
  customerNote: string | null;
  items: Array<{ productId: number; quantity: number }>;
  accountCustomerId?: number | null;
  placedByUserId?: string | null;
  placedByUsername?: string | null;
};

export class EcommerceCheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EcommerceCheckoutError";
  }
}

function clean(value: string | null | undefined, max: number) {
  const result = value?.trim() ?? "";
  return result ? result.slice(0, max) : null;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function token() {
  return Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).slice(2, 8).toUpperCase();
}

export class EcommerceCheckoutService {
  static async createOrder(input: EcommerceCheckoutInput) {
    const firstName = clean(input.firstName, 80);
    const lastName = clean(input.lastName, 80);
    const email = clean(input.email, 160)?.toLowerCase() ?? null;
    const phone = clean(input.phone, 30);
    const address = clean(input.address, 500);
    const city = clean(input.city, 80);
    const district = clean(input.district, 80);
    const postalCode = clean(input.postalCode, 20);
    const invoiceName = clean(input.invoiceName, 180);
    const taxOffice = clean(input.invoiceTaxOffice, 100);
    const taxNumber = clean(input.invoiceTaxNumber, 30);
    const customerNote = clean(input.customerNote, 1000);
    const requestedInvoiceAddress = clean(input.invoiceAddress, 500);
    const requestedInvoiceCity = clean(input.invoiceCity, 80);
    const requestedInvoiceDistrict = clean(input.invoiceDistrict, 80);
    const requestedInvoicePostalCode = clean(input.invoicePostalCode, 20);

    if (!firstName || !lastName || !email || !phone || !address || !city || !district) {
      throw new EcommerceCheckoutError("Teslimat ve iletişim bilgilerini eksiksiz doldurun.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new EcommerceCheckoutError("Geçerli bir e-posta adresi girin.");
    }
    if (input.invoiceType === "CORPORATE" && (!invoiceName || !taxNumber)) {
      throw new EcommerceCheckoutError("Kurumsal fatura için unvan ve vergi numarası zorunludur.");
    }
    if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 500) {
      throw new EcommerceCheckoutError("Sepetinizde sipariş verilebilecek ürün bulunmuyor.");
    }

    const items = input.items.map((item) => ({
      productId: Number(item.productId),
      quantity: Number(item.quantity),
    }));
    const ids = new Set(items.map((item) => item.productId));
    if (
      ids.size !== items.length ||
      items.some((item) => !Number.isSafeInteger(item.productId) || item.productId <= 0 ||
        !Number.isSafeInteger(item.quantity) || item.quantity <= 0)
    ) {
      throw new EcommerceCheckoutError("Sepette geçersiz ürün satırı bulunuyor.");
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: [...ids] },
        tenantId: B2B_CONSTANTS.TENANT_ID,
        companyId: B2B_CONSTANTS.COMPANY_ID,
        isActive: true,
      },
      select: {
        id: true, code: true, name: true, price: true, vat: true,
        stock: true, reservedStock: true,
      },
    });

    if (products.length !== items.length) {
      throw new EcommerceCheckoutError("Sepette artık satışta olmayan bir ürün bulunuyor.");
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const calculatedItems = items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new EcommerceCheckoutError("Sipariş ürünü bulunamadı.");
      if (
        !Number.isFinite(product.price) || product.price < 0 ||
        !Number.isInteger(product.vat) || product.vat < 0 || product.vat > 100 ||
        !Number.isSafeInteger(product.stock) || product.stock < 0 ||
        !Number.isSafeInteger(product.reservedStock) || product.reservedStock < 0
      ) {
        throw new EcommerceCheckoutError(
          product.name + " için fiyat, vergi veya stok bilgisi geçersiz."
        );
      }
      const available = Math.max(0, product.stock - product.reservedStock);
      if (item.quantity > available) {
        throw new EcommerceCheckoutError(
          product.name + " için kullanılabilir stok " + available + " adettir."
        );
      }
      const lineNet = roundMoney(product.price * item.quantity);
      const vatAmount = roundMoney(lineNet * (product.vat / 100));
      return {
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        vatRate: product.vat,
        lineNet,
        vatAmount,
        lineTotal: roundMoney(lineNet + vatAmount),
      };
    });

    const subtotal = roundMoney(calculatedItems.reduce((sum, item) => sum + item.lineNet, 0));
    const vatAmount = roundMoney(calculatedItems.reduce((sum, item) => sum + item.vatAmount, 0));
    const totalAmount = roundMoney(subtotal + vatAmount);
    const idToken = token();
    const fullName = firstName + " " + lastName;

    const order = await prisma.$transaction(async (tx) => {
      let customerId = input.accountCustomerId ?? null;
      let existingShippingAddressId: number | null = null;
      let invoiceSnapshot = {
        address: input.invoiceSameAsShipping === false ? requestedInvoiceAddress : address,
        city: input.invoiceSameAsShipping === false ? requestedInvoiceCity : city,
        district: input.invoiceSameAsShipping === false ? requestedInvoiceDistrict : district,
        postalCode: input.invoiceSameAsShipping === false ? requestedInvoicePostalCode : postalCode,
      };
      if (customerId) {
        const existingCustomer = await tx.customer.findFirst({
          where: { id: customerId, customerType: CustomerType.INDIVIDUAL, isActive: true },
          select: { id: true },
        });
        if (!existingCustomer) throw new EcommerceCheckoutError("Bireysel müşteri hesabı bulunamadı.");

        const requestedAddressId = Number(input.shippingAddressId);
        if (!Number.isInteger(requestedAddressId) || requestedAddressId <= 0) {
          throw new EcommerceCheckoutError("Kayıtlı teslimat adresinizi seçin.");
        }
        const memberAddress = await tx.customerAddress.findFirst({
          where: {
            id: requestedAddressId,
            customerId,
            isActive: true,
            addressType: { in: ["DELIVERY", "BOTH"] },
          },
          select: { id: true, address: true, city: true, district: true, postalCode: true },
        });
        if (!memberAddress) {
          throw new EcommerceCheckoutError("Seçilen teslimat adresi hesabınıza ait değil veya pasif.");
        }
        existingShippingAddressId = memberAddress.id;
        if (input.invoiceSameAsShipping !== false) {
          invoiceSnapshot = {
            address: memberAddress.address,
            city: memberAddress.city,
            district: memberAddress.district,
            postalCode: memberAddress.postalCode,
          };
        } else {
          const requestedInvoiceAddressId = Number(input.invoiceAddressId);
          if (!Number.isInteger(requestedInvoiceAddressId) || requestedInvoiceAddressId <= 0) {
            throw new EcommerceCheckoutError("Kayıtlı fatura adresinizi seçin.");
          }
          const memberInvoiceAddress = await tx.customerAddress.findFirst({
            where: {
              id: requestedInvoiceAddressId,
              customerId,
              isActive: true,
              addressType: { in: ["INVOICE", "BOTH"] },
            },
            select: { address: true, city: true, district: true, postalCode: true },
          });
          if (!memberInvoiceAddress) {
            throw new EcommerceCheckoutError("Seçilen fatura adresi hesabınıza ait değil veya pasif.");
          }
          invoiceSnapshot = memberInvoiceAddress;
        }
      } else {
        const customer = await tx.customer.create({
          data: {
            customerCode: "EC-" + idToken,
            customerType: CustomerType.INDIVIDUAL,
            companyName: input.invoiceType === "CORPORATE" && invoiceName ? invoiceName : fullName,
            contactName: fullName,
            phone,
            email,
            address,
            city,
            district,
            paymentTermDays: 0,
            discountRate: 0,
            creditLimit: 0,
          },
          select: { id: true },
        });
        customerId = customer.id;
      }

      if (!invoiceSnapshot.address || !invoiceSnapshot.city || !invoiceSnapshot.district) {
        throw new EcommerceCheckoutError("Fatura adresi bilgilerini eksiksiz doldurun.");
      }

      let shippingAddressId = existingShippingAddressId;
      if (!shippingAddressId) {
        const shippingAddress = await tx.customerAddress.create({
          data: {
            customerId,
            addressCode: "WEB-" + idToken,
            title: "Teslimat Adresi",
            addressType: "DELIVERY",
            contactName: fullName,
            phone,
            address,
            city,
            district,
            postalCode,
            isDefault: true,
            isActive: true,
          },
          select: { id: true },
        });
        shippingAddressId = shippingAddress.id;
      }

      return tx.order.create({
        data: {
          orderNumber: "WEB" + new Date().toISOString().slice(0, 10).replaceAll("-", "") + "-" + idToken,
          customerId,
          shippingAddressId,
          placedByUserId: input.placedByUserId ?? null,
          placedByUsername: input.placedByUsername ?? null,
          status: OrderStatus.PENDING,
          source: OrderSource.ECOMMERCE,
          orderType: OrderType.ECOMMERCE,
          paymentMethod: B2BPaymentMethod.BANK_TRANSFER,
          paymentTermDays: 0,
          discountRate: 0,
          subtotal,
          discountAmount: 0,
          vatAmount,
          totalAmount,
          customerNote,
          internalNote: "Etken Ofis B2C web mağazasından oluşturuldu.",
          ecommerceEmail: email,
          ecommercePhone: phone,
          invoiceType: input.invoiceType,
          invoiceName: invoiceName ?? fullName,
          invoiceTaxOffice: input.invoiceType === "CORPORATE" ? taxOffice : null,
          invoiceTaxNumber: input.invoiceType === "CORPORATE" ? taxNumber : null,
          invoiceAddress: invoiceSnapshot.address,
          invoiceCity: invoiceSnapshot.city,
          invoiceDistrict: invoiceSnapshot.district,
          invoicePostalCode: invoiceSnapshot.postalCode,
          paymentStatus: "PENDING",
          paymentProvider: "BANK_TRANSFER",
          statusHistory: {
            create: {
              status: OrderStatus.PENDING,
              note: "Siparişiniz alındı ve onay bekliyor.",
              visibleToCustomer: true,
            },
          },
          accountEntries: {
            create: {
              customerId,
              direction: CustomerAccountEntryDirection.DEBIT,
              entryType: CustomerAccountEntryType.ORDER,
              amount: totalAmount,
              description: "B2C e-ticaret sipariş borç kaydı",
              referenceNo: "WEB" + idToken,
              createdByUsername: "B2C Web Mağazası",
            },
          },
          items: { create: calculatedItems },
        },
        select: { id: true, orderNumber: true, totalAmount: true },
      });
    });
    // The order is already committed. A notification outage must not turn a
    // successful checkout into an error that prompts the buyer to order twice.
    try {
      const notification = await EcommerceNotificationService.send({
        event: "ORDER_RECEIVED",
        email,
        orderNumber: order.orderNumber,
        paymentMethod: B2BPaymentMethod.BANK_TRANSFER,
      });
      if (notification.status === "failed") {
        console.error("Checkout notification delivery failed after order commit", {
          orderId: order.id,
          reason: notification.reason,
        });
      }
    } catch (error) {
      console.error("Checkout notification failed after order commit", {
        orderId: order.id,
        error: error instanceof Error ? error.message : "unknown error",
      });
    }
    return order;
  }
}

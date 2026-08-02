import "server-only";

import {
  B2BPaymentMethod,
  CustomerAccountEntryDirection,
  CustomerAccountEntryType,
  OrderSource,
  OrderStatus,
  UserType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";
import {
  getCustomerAccountSummary,
  getCustomerDueDate,
} from "@/modules/b2b/services/customer-account.service";
import type { AuthUser } from "@/modules/auth/types/auth.types";
import { getCustomerAddressWhere } from "@/modules/b2b/services/customer-user-access.service";

export type B2BCheckoutItemInput = {
  productId: number;
  quantity: number;
};

export type B2BCheckoutInput = {
  shippingAddressId: number;
  paymentMethod:
    | "BANK_TRANSFER"
    | "CURRENT_ACCOUNT";
  requestedDate:
    string | null;
  customerNote:
    string | null;
  items:
    B2BCheckoutItemInput[];
};

export type B2BCheckoutResult = {
  orderId: number;
  orderNumber: string;
};

export class B2BCheckoutError
  extends Error {
  constructor(message: string) {
    super(message);
    this.name =
      "B2BCheckoutError";
  }
}

function roundMoney(
  value: number
) {
  return (
    Math.round(
      (value +
        Number.EPSILON) *
        100
    ) / 100
  );
}

function createOrderNumber() {
  const now = new Date();
  const year =
    now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    now.getDate()
  ).padStart(2, "0");
  const time = String(
    now.getTime()
  ).slice(-8);
  const random = String(
    Math.floor(
      Math.random() * 1000
    )
  ).padStart(3, "0");

  return (
    "B2B" +
    year +
    month +
    day +
    "-" +
    time +
    random
  );
}

function parseRequestedDate(
  value: string | null
) {
  if (!value) {
    return null;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    throw new B2BCheckoutError(
      "Talep edilen teslim tarihi geçerli değil."
    );
  }

  const date =
    new Date(
      value + "T12:00:00"
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new B2BCheckoutError(
      "Talep edilen teslim tarihi geçerli değil."
    );
  }

  const today =
    new Date();
  today.setHours(
    0,
    0,
    0,
    0
  );

  if (date < today) {
    throw new B2BCheckoutError(
      "Talep edilen teslim tarihi geçmiş bir tarih olamaz."
    );
  }

  return date;
}

export class B2BCheckoutService {
  static async createOrder(
    user: AuthUser,
    input: B2BCheckoutInput
  ): Promise<B2BCheckoutResult> {
    if (
      user.userType !==
        UserType.CUSTOMER ||
      !user.customerId ||
      !user.customer ||
      !user.customer.isActive
    ) {
      throw new B2BCheckoutError(
        "Sipariş vermek için aktif bir kurumsal müşteri hesabıyla giriş yapmalısınız."
      );
    }

    if (
      !Array.isArray(
        input.items
      ) ||
      input.items.length === 0 ||
      input.items.length > 500
    ) {
      throw new B2BCheckoutError(
        "Sepetinizde sipariş verilebilecek ürün bulunmuyor."
      );
    }

    const submittedItems =
      input.items.map(
        (item) => ({
          productId:
            Number(
              item.productId
            ),
          quantity:
            Number(
              item.quantity
            ),
        })
      );

    const uniqueProductIds =
      new Set(
        submittedItems.map(
          (item) =>
            item.productId
        )
      );

    if (
      uniqueProductIds.size !==
        submittedItems.length ||
      submittedItems.some(
        (item) =>
          !Number.isInteger(
            item.productId
          ) ||
          item.productId <= 0 ||
          !Number.isInteger(
            item.quantity
          ) ||
          item.quantity <= 0
      )
    ) {
      throw new B2BCheckoutError(
        "Sepette geçersiz veya tekrarlı ürün satırı bulunuyor."
      );
    }

    const shippingAddressId =
      Number(
        input.shippingAddressId
      );

    if (
      !Number.isInteger(
        shippingAddressId
      ) ||
      shippingAddressId <= 0
    ) {
      throw new B2BCheckoutError(
        "Teslimat adresi seçmelisiniz."
      );
    }

    const paymentMethod =
      input.paymentMethod ===
      "CURRENT_ACCOUNT"
        ? B2BPaymentMethod.CURRENT_ACCOUNT
        : input.paymentMethod ===
            "BANK_TRANSFER"
          ? B2BPaymentMethod.BANK_TRANSFER
          : null;

    if (!paymentMethod) {
      throw new B2BCheckoutError(
        "Geçerli bir ödeme yöntemi seçmelisiniz."
      );
    }

    const customerNote =
      input.customerNote
        ?.trim() || null;

    if (
      customerNote &&
      customerNote.length > 1000
    ) {
      throw new B2BCheckoutError(
        "Sipariş notu en fazla 1000 karakter olabilir."
      );
    }

    const requestedDate =
      parseRequestedDate(
        input.requestedDate
      );

    const [
      customer,
      address,
      products,
    ] = await Promise.all([
      prisma.customer.findFirst({
        where: {
          id: user.customerId,
          isActive: true,
        },
        select: {
          id: true,
          paymentTermDays: true,
          discountRate: true,
          creditLimit: true,
        },
      }),
      prisma.customerAddress.findFirst({
        where: {
          id: shippingAddressId,
          ...getCustomerAddressWhere(user),
        },
        select: {
          id: true,
        },
      }),
      prisma.product.findMany({
        where: {
          id: {
            in: [
              ...uniqueProductIds,
            ],
          },
          tenantId:
            B2B_CONSTANTS
              .TENANT_ID,
          companyId:
            B2B_CONSTANTS
              .COMPANY_ID,
          isActive: true,
        },
        select: {
          id: true,
          code: true,
          name: true,
          price: true,
          vat: true,
          stock: true,
          reservedStock: true,
        },
      }),
    ]);

    if (!customer) {
      throw new B2BCheckoutError(
        "Müşteri hesabı bulunamadı veya pasif durumda."
      );
    }

    if (!address) {
      throw new B2BCheckoutError(
        "Teslimat adresi müşteriye ait değil veya pasif durumda."
      );
    }

    if (
      products.length !==
      submittedItems.length
    ) {
      throw new B2BCheckoutError(
        "Sepette artık satışta olmayan bir ürün bulunuyor."
      );
    }

    const productMap =
      new Map(
        products.map(
          (product) => [
            product.id,
            product,
          ]
        )
      );

    const calculatedItems =
      submittedItems.map(
        (submittedItem) => {
          const product =
            productMap.get(
              submittedItem
                .productId
            );

          if (!product) {
            throw new B2BCheckoutError(
              "Sipariş ürünü bulunamadı."
            );
          }

          const availableStock =
            Math.max(
              0,
              product.stock -
                product
                  .reservedStock
            );

          if (
            submittedItem.quantity >
            availableStock
          ) {
            throw new B2BCheckoutError(
              product.name +
                " için kullanılabilir stok " +
                availableStock +
                " adettir. Sepet miktarını güncelleyin."
            );
          }

          const lineNet =
            roundMoney(
              product.price *
                submittedItem
                  .quantity
            );
          const vatAmount =
            roundMoney(
              lineNet *
                (product.vat /
                  100)
            );

          return {
            productId:
              product.id,
            productCode:
              product.code,
            productName:
              product.name,
            quantity:
              submittedItem
                .quantity,
            unitPrice:
              product.price,
            vatRate:
              product.vat,
            lineNet,
            vatAmount,
            lineTotal:
              roundMoney(
                lineNet +
                  vatAmount
              ),
          };
        }
      );

    const subtotal =
      roundMoney(
        calculatedItems.reduce(
          (sum, item) =>
            sum +
            item.lineNet,
          0
        )
      );

    if (
      subtotal <
      B2B_CONSTANTS
        .MINIMUM_ORDER_NET_AMOUNT
    ) {
      throw new B2BCheckoutError(
        "Minimum sipariş tutarı KDV hariç " +
          B2B_CONSTANTS
            .MINIMUM_ORDER_NET_AMOUNT +
          " TL'dir."
      );
    }

    const discountRate =
      Math.max(
        0,
        Math.min(
          100,
          customer.discountRate
        )
      );
    const discountAmount =
      roundMoney(
        subtotal *
          (discountRate / 100)
      );
    const discountedSubtotal =
      roundMoney(
        subtotal -
          discountAmount
      );
    const originalVatAmount =
      roundMoney(
        calculatedItems.reduce(
          (sum, item) =>
            sum +
            item.vatAmount,
          0
        )
      );
    const vatAmount =
      subtotal > 0
        ? roundMoney(
            originalVatAmount *
              (
                discountedSubtotal /
                subtotal
              )
          )
        : 0;
    const totalAmount =
      roundMoney(
        discountedSubtotal +
          vatAmount
      );

    const accountSummary =
      paymentMethod ===
        B2BPaymentMethod
          .CURRENT_ACCOUNT
        ? await getCustomerAccountSummary(
            customer.id
          )
        : null;

    const projectedBalance =
      roundMoney(
        (
          accountSummary
            ?.balance ?? 0
        ) +
          totalAmount
      );

    if (
      paymentMethod ===
        B2BPaymentMethod
          .CURRENT_ACCOUNT &&
      (
        customer.creditLimit <=
          0 ||
        projectedBalance >
          customer.creditLimit
      )
    ) {
      throw new B2BCheckoutError(
        customer.creditLimit <= 0
          ? "Cari hesap ödeme yöntemi bu müşteri için tanımlı değil."
          : "Mevcut cari bakiye ile birlikte sipariş toplamı tanımlı kredi limitini aşıyor."
      );
    }

    const order =
      await prisma.order.create({
        data: {
          orderNumber:
            createOrderNumber(),
          customerId:
            customer.id,
          shippingAddressId:
            address.id,
          status:
            OrderStatus.PENDING,
          source:
            OrderSource.B2B,
          paymentMethod,
          placedByUserId:
            user.id,
          placedByUsername:
            user.username,
          requestedDate,
          paymentTermDays:
            customer
              .paymentTermDays,
          discountRate,
          subtotal,
          discountAmount,
          vatAmount,
          totalAmount,
          customerNote,
          internalNote:
            "B2B müşteri portalından oluşturuldu.",
          statusHistory: {
            create: {
              status:
                OrderStatus.PENDING,
              note:
                "Siparişiniz alındı ve onay bekliyor.",
              visibleToCustomer:
                true,
            },
          },
          accountEntries: {
            create: {
              customerId:
                customer.id,
              direction:
                CustomerAccountEntryDirection.DEBIT,
              entryType:
                CustomerAccountEntryType.ORDER,
              amount:
                totalAmount,
              description:
                "B2B sipariş borç kaydı",
              dueDate:
                getCustomerDueDate(
                  customer
                    .paymentTermDays
                ),
              createdByUserId:
                user.id,
              createdByUsername:
                user.username,
            },
          },
          items: {
            create:
              calculatedItems,
          },
        },
        select: {
          id: true,
          orderNumber: true,
        },
      });

    return {
      orderId:
        order.id,
      orderNumber:
        order.orderNumber,
    };
  }
}

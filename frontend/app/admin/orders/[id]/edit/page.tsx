import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import OrderEditForm from "@/components/admin/OrderEditForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type SubmittedOrderItem = {
  productId: number;
  quantity: number;
};

function formatDateForInput(
  value: Date | null
) {
  if (!value) {
    return "";
  }

  const year = value.getFullYear();
  const month = String(
    value.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    value.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function EditOrderPage({
  params,
}: Props) {
  const { id } = await params;
  const orderId = Number(id);

  if (!Number.isInteger(orderId)) {
    notFound();
  }

  const [order, customers, products] =
    await Promise.all([
      prisma.order.findUnique({
        where: {
          id: orderId,
        },

        include: {
          items: {
            orderBy: {
              id: "asc",
            },

            select: {
              id: true,
              productId: true,
              quantity: true,
            },
          },
        },
      }),

      prisma.customer.findMany({
        where: {
          isActive: true,
        },

        orderBy: {
          companyName: "asc",
        },

        select: {
          id: true,
          customerCode: true,
          companyName: true,
          paymentTermDays: true,
          discountRate: true,

          addresses: {
            where: {
              isActive: true,
            },

            orderBy: [
              {
                isDefault: "desc",
              },
              {
                title: "asc",
              },
            ],

            select: {
              id: true,
              customerId: true,
              title: true,
              city: true,
              district: true,
              isDefault: true,
            },
          },
        },
      }),

      prisma.product.findMany({
        where: {
          isActive: true,
        },

        orderBy: {
          name: "asc",
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

  if (!order) {
    notFound();
  }

  const editableStatuses = [
    "DRAFT",
    "PENDING",
  ];

  if (
    !editableStatuses.includes(order.status)
  ) {
    redirect(`/admin/orders/${orderId}`);
  }

  async function updateOrder(
    formData: FormData
  ) {
    "use server";

    const existingOrder =
      await prisma.order.findUnique({
        where: {
          id: orderId,
        },

        select: {
          id: true,
          status: true,
          stockReserved: true,
          stockDeducted: true,
        },
      });

    if (!existingOrder) {
      throw new Error(
        "Sipariş bulunamadı."
      );
    }

    if (
      !["DRAFT", "PENDING"].includes(
        existingOrder.status
      ) ||
      existingOrder.stockReserved ||
      existingOrder.stockDeducted
    ) {
      throw new Error(
        "Bu sipariş artık düzenlenemez."
      );
    }

    const customerId = Number(
      formData.get("customerId")
    );

    const shippingAddressIdValue = String(
      formData.get("shippingAddressId") ??
        ""
    ).trim();

    const requestedDateValue = String(
      formData.get("requestedDate") ?? ""
    ).trim();

    const customerNote =
      String(
        formData.get("customerNote") ?? ""
      ).trim() || null;

    const internalNote =
      String(
        formData.get("internalNote") ?? ""
      ).trim() || null;

    const itemsJson = String(
      formData.get("itemsJson") ?? "[]"
    );

    let submittedItems: SubmittedOrderItem[] =
      [];

    try {
      submittedItems =
        JSON.parse(itemsJson);
    } catch {
      throw new Error(
        "Sipariş ürünleri okunamadı."
      );
    }

    if (!Number.isInteger(customerId)) {
      throw new Error(
        "Geçerli bir müşteri seçilmelidir."
      );
    }

    if (submittedItems.length === 0) {
      throw new Error(
        "Siparişte en az bir ürün bulunmalıdır."
      );
    }

    const customer =
      await prisma.customer.findFirst({
        where: {
          id: customerId,
          isActive: true,
        },
      });

    if (!customer) {
      throw new Error(
        "Müşteri bulunamadı veya müşteri pasif."
      );
    }

    /*
     * Aynı ürün birden fazla satırda seçildiyse
     * miktarları tek ürün altında birleştiriyoruz.
     */
    const quantityByProduct =
      new Map<number, number>();

    for (const submittedItem of submittedItems) {
      const productId = Number(
        submittedItem.productId
      );

      const quantity = Number(
        submittedItem.quantity
      );

      if (
        !Number.isInteger(productId) ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        throw new Error(
          "Geçersiz ürün veya miktar bilgisi."
        );
      }

      quantityByProduct.set(
        productId,
        (quantityByProduct.get(productId) ??
          0) + quantity
      );
    }

    const productIds = Array.from(
      quantityByProduct.keys()
    );

    const selectedProducts =
      await prisma.product.findMany({
        where: {
          id: {
            in: productIds,
          },
          isActive: true,
        },
      });

    if (
      selectedProducts.length !==
      productIds.length
    ) {
      throw new Error(
        "Siparişte pasif veya geçersiz ürün bulunuyor."
      );
    }

    const calculatedItems =
      selectedProducts.map((product) => {
        const quantity =
          quantityByProduct.get(product.id) ??
          0;

        const availableStock =
          product.stock -
          product.reservedStock;

        if (quantity > availableStock) {
          throw new Error(
            `${product.name} için yeterli kullanılabilir stok yok. ` +
              `Kullanılabilir stok: ${availableStock}, ` +
              `sipariş miktarı: ${quantity}.`
          );
        }

        const lineNet =
          product.price * quantity;

        const vatAmount =
          lineNet *
          (product.vat / 100);

        const lineTotal =
          lineNet + vatAmount;

        return {
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          quantity,
          unitPrice: product.price,
          vatRate: product.vat,
          lineNet,
          vatAmount,
          lineTotal,
        };
      });

    const subtotal =
      calculatedItems.reduce(
        (sum, item) =>
          sum + item.lineNet,
        0
      );

    const vatAmount =
      calculatedItems.reduce(
        (sum, item) =>
          sum + item.vatAmount,
        0
      );

    const totalAmount =
      subtotal + vatAmount;

    const shippingAddressId =
      shippingAddressIdValue
        ? Number(shippingAddressIdValue)
        : null;

    if (shippingAddressId !== null) {
      const address =
        await prisma.customerAddress.findFirst({
          where: {
            id: shippingAddressId,
            customerId,
            isActive: true,
          },
        });

      if (!address) {
        throw new Error(
          "Teslimat adresi müşteriye ait değil veya adres pasif."
        );
      }
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.orderItem.deleteMany({
          where: {
            orderId,
          },
        });

        await tx.order.update({
          where: {
            id: orderId,
          },

          data: {
            customerId,
            shippingAddressId,

            requestedDate:
              requestedDateValue
                ? new Date(
                    `${requestedDateValue}T12:00:00`
                  )
                : null,

            paymentTermDays:
              customer.paymentTermDays,

            discountRate: 0,
            discountAmount: 0,

            subtotal,
            vatAmount,
            totalAmount,

            customerNote,
            internalNote,

            items: {
              create: calculatedItems,
            },
          },
        });
      }
    );

    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath(
      `/admin/orders/${orderId}`
    );
    revalidatePath(
      `/admin/orders/${orderId}/edit`
    );

    redirect(`/admin/orders/${orderId}`);
  }

  return (
    <section className="p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">
            Sipariş Güncelle
          </h1>

          <p className="mt-2 text-gray-500">
            {order.orderNumber} numaralı
            siparişin bilgilerini güncelleyin.
          </p>
        </div>

        <Link
          href={`/admin/orders/${order.id}`}
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50"
        >
          ← Sipariş Detayına Dön
        </Link>
      </div>

      <div className="mt-8 rounded-xl bg-blue-50 p-5 text-blue-800">
        Bu sipariş henüz onaylanmadığı için müşteri,
        adres, ürün, miktar, tarih ve not bilgileri
        güncellenebilir.
      </div>

      <OrderEditForm
        customers={customers}
        products={products}
        initialCustomerId={order.customerId}
        initialShippingAddressId={
          order.shippingAddressId
        }
        initialRequestedDate={formatDateForInput(
          order.requestedDate
        )}
        initialCustomerNote={
          order.customerNote ?? ""
        }
        initialInternalNote={
          order.internalNote ?? ""
        }
        initialLines={order.items}
        action={updateOrder}
      />
    </section>
  );
}
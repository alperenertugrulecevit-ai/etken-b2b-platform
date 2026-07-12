"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

type SubmittedOrderItem = {
  productId: number;
  quantity: number;
};

function createOrderNumber() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const time = String(now.getTime()).slice(-6);

  return `SIP${year}${month}${day}-${time}`;
}

export async function createOrder(formData: FormData) {
  const customerId = Number(formData.get("customerId"));
  const shippingAddressIdValue = String(
    formData.get("shippingAddressId") ?? ""
  ).trim();

  const requestedDateValue = String(
    formData.get("requestedDate") ?? ""
  ).trim();

  const customerNote =
    String(formData.get("customerNote") ?? "").trim() || null;

  const internalNote =
    String(formData.get("internalNote") ?? "").trim() || null;

  const itemsJson = String(formData.get("itemsJson") ?? "[]");

  let submittedItems: SubmittedOrderItem[] = [];

  try {
    submittedItems = JSON.parse(itemsJson);
  } catch {
    throw new Error("Sipariş ürünleri okunamadı.");
  }

  if (!Number.isInteger(customerId)) {
    throw new Error("Geçerli bir müşteri seçilmelidir.");
  }

  if (submittedItems.length === 0) {
    throw new Error("Siparişte en az bir ürün bulunmalıdır.");
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      isActive: true,
    },
  });

  if (!customer) {
    throw new Error("Müşteri bulunamadı veya müşteri pasif.");
  }

  const productIds = [
    ...new Set(
      submittedItems
        .map((item) => Number(item.productId))
        .filter((id) => Number.isInteger(id))
    ),
  ];

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
      isActive: true,
    },
  });

  if (products.length !== productIds.length) {
    throw new Error("Siparişte pasif veya geçersiz ürün bulunuyor.");
  }

  const productMap = new Map(
    products.map((product) => [product.id, product])
  );

  const calculatedItems = submittedItems.map((submittedItem) => {
    const product = productMap.get(Number(submittedItem.productId));
    const quantity = Number(submittedItem.quantity);

    if (!product) {
      throw new Error("Sipariş ürünü bulunamadı.");
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Ürün miktarı sıfırdan büyük olmalıdır.");
    }

    const lineNet = product.price * quantity;
    const vatAmount = lineNet * (product.vat / 100);
    const lineTotal = lineNet + vatAmount;

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

  const subtotal = calculatedItems.reduce(
    (sum, item) => sum + item.lineNet,
    0
  );

  const discountRate = customer.discountRate;

  const discountAmount = subtotal * (discountRate / 100);

  const discountedSubtotal = subtotal - discountAmount;

  const originalVatAmount = calculatedItems.reduce(
    (sum, item) => sum + item.vatAmount,
    0
  );

  const vatAmount =
    subtotal > 0
      ? originalVatAmount * (discountedSubtotal / subtotal)
      : 0;

  const totalAmount = discountedSubtotal + vatAmount;

  const shippingAddressId = shippingAddressIdValue
    ? Number(shippingAddressIdValue)
    : null;

  if (shippingAddressId !== null) {
    const address = await prisma.customerAddress.findFirst({
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

  await prisma.order.create({
    data: {
      orderNumber: createOrderNumber(),
      customerId,
      shippingAddressId,
      status: "PENDING",

      requestedDate: requestedDateValue
        ? new Date(`${requestedDateValue}T12:00:00`)
        : null,

      paymentTermDays: customer.paymentTermDays,
      discountRate,
      subtotal,
      discountAmount,
      vatAmount,
      totalAmount,
      customerNote,
      internalNote,

      items: {
        create: calculatedItems,
      },
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/orders");

  redirect("/admin/orders");
}
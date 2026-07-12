"use client";

import { useMemo, useState } from "react";

type CustomerAddress = {
  id: number;
  customerId: number;
  title: string;
  city: string;
  district: string;
  isDefault: boolean;
};

type Customer = {
  id: number;
  customerCode: string;
  companyName: string;
  paymentTermDays: number;
  discountRate: number;
  addresses: CustomerAddress[];
};

type Product = {
  id: number;
  code: string;
  name: string;
  price: number;
  vat: number;
  stock: number;
  reservedStock: number;
};

type InitialOrderLine = {
  id: number;
  productId: number;
  quantity: number;
};

type OrderLine = {
  rowId: number;
  productId: number;
  quantity: number;
};

type Props = {
  customers: Customer[];
  products: Product[];
  initialCustomerId: number;
  initialShippingAddressId: number | null;
  initialRequestedDate: string;
  initialCustomerNote: string;
  initialInternalNote: string;
  initialLines: InitialOrderLine[];
  action: (formData: FormData) => void | Promise<void>;
};

function formatCurrency(value: number) {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function OrderEditForm({
  customers,
  products,
  initialCustomerId,
  initialShippingAddressId,
  initialRequestedDate,
  initialCustomerNote,
  initialInternalNote,
  initialLines,
  action,
}: Props) {
  const [customerId, setCustomerId] = useState(
    String(initialCustomerId)
  );

  const [shippingAddressId, setShippingAddressId] = useState(
    initialShippingAddressId
      ? String(initialShippingAddressId)
      : ""
  );

  const [lines, setLines] = useState<OrderLine[]>(
    initialLines.length > 0
      ? initialLines.map((line, index) => ({
          rowId: line.id || Date.now() + index,
          productId: line.productId,
          quantity: line.quantity,
        }))
      : [
          {
            rowId: Date.now(),
            productId: products[0]?.id ?? 0,
            quantity: 1,
          },
        ]
  );

  const selectedCustomer = customers.find(
    (customer) => customer.id === Number(customerId)
  );

  const availableAddresses =
    selectedCustomer?.addresses ?? [];

  const productMap = useMemo(
    () =>
      new Map(
        products.map((product) => [
          product.id,
          product,
        ])
      ),
    [products]
  );

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => {
      const product = productMap.get(line.productId);

      if (!product) {
        return sum;
      }

      return sum + product.price * line.quantity;
    }, 0);

    const vatAmount = lines.reduce((sum, line) => {
      const product = productMap.get(line.productId);

      if (!product) {
        return sum;
      }

      const lineNet =
        product.price * line.quantity;

      return (
        sum +
        lineNet * (product.vat / 100)
      );
    }, 0);

    return {
      subtotal,
      vatAmount,
      totalAmount: subtotal + vatAmount,
    };
  }, [lines, productMap]);

  const vatBreakdown = useMemo(() => {
    const vatMap = new Map<number, number>();

    for (const line of lines) {
      const product = productMap.get(line.productId);

      if (!product) {
        continue;
      }

      const lineNet =
        product.price * line.quantity;

      const lineVat =
        lineNet * (product.vat / 100);

      const currentAmount =
        vatMap.get(product.vat) ?? 0;

      vatMap.set(
        product.vat,
        currentAmount + lineVat
      );
    }

    return Array.from(vatMap.entries())
      .map(([rate, amount]) => ({
        rate,
        amount,
      }))
      .sort(
        (first, second) =>
          first.rate - second.rate
      );
  }, [lines, productMap]);

  const itemsJson = JSON.stringify(
    lines
      .filter(
        (line) =>
          line.productId > 0 &&
          line.quantity > 0
      )
      .map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
      }))
  );

  function handleCustomerChange(value: string) {
    setCustomerId(value);

    const customer = customers.find(
      (item) => item.id === Number(value)
    );

    const defaultAddress =
      customer?.addresses.find(
        (address) => address.isDefault
      );

    setShippingAddressId(
      defaultAddress
        ? String(defaultAddress.id)
        : ""
    );
  }

  function addLine() {
    setLines((currentLines) => [
      ...currentLines,
      {
        rowId:
          Date.now() +
          Math.floor(Math.random() * 1000),
        productId: products[0]?.id ?? 0,
        quantity: 1,
      },
    ]);
  }

  function removeLine(rowId: number) {
    setLines((currentLines) => {
      if (currentLines.length === 1) {
        return currentLines;
      }

      return currentLines.filter(
        (line) => line.rowId !== rowId
      );
    });
  }

  function updateLine(
    rowId: number,
    field: "productId" | "quantity",
    value: number
  ) {
    setLines((currentLines) =>
      currentLines.map((line) =>
        line.rowId === rowId
          ? {
              ...line,
              [field]: value,
            }
          : line
      )
    );
  }

  return (
    <form
      action={action}
      className="mt-10 grid gap-8 xl:grid-cols-[1fr_380px]"
    >
      <input
        type="hidden"
        name="itemsJson"
        value={itemsJson}
      />

      <div className="space-y-8">
        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">
            Müşteri ve Teslimat
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-semibold">
                Müşteri
              </span>

              <select
                name="customerId"
                value={customerId}
                onChange={(event) =>
                  handleCustomerChange(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border bg-white p-4"
                required
              >
                <option value="">
                  Müşteri seçiniz
                </option>

                {customers.map((customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    {customer.customerCode} —{" "}
                    {customer.companyName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Teslimat Adresi
              </span>

              <select
                name="shippingAddressId"
                value={shippingAddressId}
                onChange={(event) =>
                  setShippingAddressId(
                    event.target.value
                  )
                }
                disabled={!customerId}
                className={`w-full rounded-xl border p-4 ${
                  customerId
                    ? "bg-white"
                    : "cursor-not-allowed bg-slate-100 text-slate-400"
                }`}
              >
                <option value="">
                  {customerId
                    ? "Adres seçiniz"
                    : "Önce müşteri seçiniz"}
                </option>

                {availableAddresses.map(
                  (address) => (
                    <option
                      key={address.id}
                      value={address.id}
                    >
                      {address.title} —{" "}
                      {address.city}/
                      {address.district}
                      {address.isDefault
                        ? " (Varsayılan)"
                        : ""}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                Talep Edilen Teslim Tarihi
              </span>

              <input
                name="requestedDate"
                type="date"
                defaultValue={initialRequestedDate}
                className="w-full rounded-xl border p-4"
              />
            </label>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-gray-500">
                Ticari Koşullar
              </p>

              <p className="mt-2 font-semibold">
                Vade:{" "}
                {selectedCustomer?.paymentTermDays ??
                  0}{" "}
                gün
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Müşteri kartı iskontosu: %
                {selectedCustomer?.discountRate ?? 0}
              </p>

              <p className="mt-1 text-xs text-orange-600">
                İskonto bu siparişe
                uygulanmamaktadır.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">
                Sipariş Ürünleri
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Ürünleri ve sipariş miktarlarını
                güncelleyin.
              </p>
            </div>

            <button
              type="button"
              onClick={addLine}
              className="rounded-xl bg-slate-800 px-5 py-3 font-semibold text-white hover:bg-slate-700"
            >
              + Ürün Satırı Ekle
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {lines.map((line, index) => {
              const product = productMap.get(
                line.productId
              );

              const lineNet = product
                ? product.price * line.quantity
                : 0;

              const lineVat = product
                ? lineNet * (product.vat / 100)
                : 0;

              const lineTotal =
                lineNet + lineVat;

              const availableStock = product
                ? product.stock -
                  product.reservedStock
                : 0;

              return (
                <div
                  key={line.rowId}
                  className="grid gap-4 rounded-xl border p-4 lg:grid-cols-[70px_1fr_110px_130px_110px_140px_110px]"
                >
                  <div>
                    <span className="mb-2 block text-sm font-semibold">
                      Satır
                    </span>

                    <div className="rounded-xl bg-slate-100 p-4 text-center font-bold">
                      {index + 1}
                    </div>
                  </div>

                  <label>
                    <span className="mb-2 block text-sm font-semibold">
                      Ürün
                    </span>

                    <select
                      value={line.productId}
                      onChange={(event) =>
                        updateLine(
                          line.rowId,
                          "productId",
                          Number(event.target.value)
                        )
                      }
                      className="w-full rounded-xl border bg-white p-4"
                      required
                    >
                      {products.map(
                        (productOption) => (
                          <option
                            key={productOption.id}
                            value={productOption.id}
                          >
                            {productOption.code} —{" "}
                            {productOption.name}{" "}
                            (Kullanılabilir:{" "}
                            {productOption.stock -
                              productOption.reservedStock}
                            )
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold">
                      Miktar
                    </span>

                    <input
                      type="number"
                      min="1"
                      max={
                        availableStock > 0
                          ? availableStock
                          : undefined
                      }
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(
                          line.rowId,
                          "quantity",
                          Number(event.target.value)
                        )
                      }
                      className="w-full rounded-xl border p-4"
                      required
                    />
                  </label>

                  <div>
                    <span className="mb-2 block text-sm font-semibold">
                      Birim Fiyat
                    </span>

                    <div className="rounded-xl bg-slate-50 p-4 font-semibold">
                      {formatCurrency(
                        product?.price ?? 0
                      )}{" "}
                      ₺
                    </div>
                  </div>

                  <div>
                    <span className="mb-2 block text-sm font-semibold">
                      KDV
                    </span>

                    <div className="rounded-xl bg-blue-50 p-4 font-semibold text-blue-700">
                      %{product?.vat ?? 0}
                    </div>
                  </div>

                  <div>
                    <span className="mb-2 block text-sm font-semibold">
                      Toplam
                    </span>

                    <div className="rounded-xl bg-slate-50 p-4 font-bold">
                      {formatCurrency(lineTotal)} ₺
                    </div>
                  </div>

                  <div>
                    <span className="mb-2 block text-sm font-semibold">
                      İşlem
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        removeLine(line.rowId)
                      }
                      disabled={lines.length === 1}
                      className={`w-full rounded-xl p-4 font-semibold ${
                        lines.length > 1
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "cursor-not-allowed bg-gray-200 text-gray-400"
                      }`}
                    >
                      Sil
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">
            Sipariş Notları
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-semibold">
                Müşteri Notu
              </span>

              <textarea
                name="customerNote"
                rows={4}
                defaultValue={initialCustomerNote}
                placeholder="Teslimat veya müşteri talebi"
                className="w-full resize-none rounded-xl border p-4"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">
                İç Operasyon Notu
              </span>

              <textarea
                name="internalNote"
                rows={4}
                defaultValue={initialInternalNote}
                placeholder="Depo ve operasyon ekibi için not"
                className="w-full resize-none rounded-xl border p-4"
              />
            </label>
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-2xl bg-white p-6 shadow">
        <h2 className="text-2xl font-bold">
          Güncel Sipariş Özeti
        </h2>

        <div className="mt-8 space-y-5">
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">
              KDV Hariç Tutar
            </span>

            <strong>
              {formatCurrency(totals.subtotal)} ₺
            </strong>
          </div>

          <div className="border-t pt-5">
            <p className="mb-4 font-bold">
              KDV Dağılımı
            </p>

            <div className="space-y-4">
              {vatBreakdown.map((vatItem) => (
                <div
                  key={vatItem.rate}
                  className="flex justify-between gap-4"
                >
                  <span className="text-gray-500">
                    KDV %{vatItem.rate}
                  </span>

                  <strong>
                    {formatCurrency(
                      vatItem.amount
                    )}{" "}
                    ₺
                  </strong>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between gap-4 border-t pt-5">
            <span className="font-semibold text-gray-600">
              Toplam KDV
            </span>

            <strong>
              {formatCurrency(totals.vatAmount)} ₺
            </strong>
          </div>

          <div className="border-t pt-5">
            <div className="flex justify-between gap-4">
              <span className="text-lg font-bold">
                Genel Toplam
              </span>

              <strong className="text-2xl text-blue-900">
                {formatCurrency(
                  totals.totalAmount
                )}{" "}
                ₺
              </strong>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={
            !customerId ||
            products.length === 0 ||
            lines.length === 0
          }
          className={`mt-8 w-full rounded-xl py-4 font-bold ${
            customerId &&
            products.length > 0 &&
            lines.length > 0
              ? "bg-blue-900 text-white hover:bg-blue-800"
              : "cursor-not-allowed bg-gray-300 text-gray-500"
          }`}
        >
          Değişiklikleri Kaydet
        </button>
      </aside>
    </form>
  );
}
"use client";

import {
  type FormEvent,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { submitB2BOrderAction } from "@/app/checkout/actions";
import { useCart } from "@/context/CartContext";
import { B2B_CONSTANTS } from "@/modules/b2b/constants/b2b.constants";

type AddressOption = {
  id: number;
  title: string;
  address: string;
  city: string;
  district: string;
  isDefault: boolean;
};

type Props = {
  addresses:
    AddressOption[];
  discountRate: number;
  creditLimit: number;
  paymentTermDays: number;
};

function formatCurrency(
  value: number
) {
  return value.toLocaleString(
    "tr-TR",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

export default function B2BCheckoutForm({
  addresses,
  discountRate,
  creditLimit,
  paymentTermDays,
}: Props) {
  const router = useRouter();
  const {
    cart,
    isHydrated,
    clearCart,
  } = useCart();

  const defaultAddress =
    addresses.find(
      (address) =>
        address.isDefault
    ) ?? addresses[0];

  const [
    shippingAddressId,
    setShippingAddressId,
  ] = useState(
    defaultAddress
      ? String(
          defaultAddress.id
        )
      : ""
  );
  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState<
    | "BANK_TRANSFER"
    | "CURRENT_ACCOUNT"
  >("BANK_TRANSFER");
  const [
    requestedDate,
    setRequestedDate,
  ] = useState("");
  const [
    customerNote,
    setCustomerNote,
  ] = useState("");
  const [
    message,
    setMessage,
  ] = useState("");
  const [
    pending,
    setPending,
  ] = useState(false);

  const totals =
    useMemo(() => {
      const subtotal =
        cart.reduce(
          (sum, item) =>
            sum +
            item.unitPrice *
              item.qty,
          0
        );
      const originalVat =
        cart.reduce(
          (sum, item) =>
            sum +
            item.unitPrice *
              item.qty *
              (item.vatRate /
                100),
          0
        );
      const discountAmount =
        subtotal *
        (discountRate /
          100);
      const discountedSubtotal =
        subtotal -
        discountAmount;
      const vatAmount =
        subtotal > 0
          ? originalVat *
            (
              discountedSubtotal /
              subtotal
            )
          : 0;

      return {
        subtotal,
        discountAmount,
        vatAmount,
        total:
          discountedSubtotal +
          vatAmount,
      };
    }, [
      cart,
      discountRate,
    ]);

  const minimumMet =
    totals.subtotal >=
    B2B_CONSTANTS
      .MINIMUM_ORDER_NET_AMOUNT;

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      pending ||
      !minimumMet ||
      cart.length === 0
    ) {
      return;
    }

    setPending(true);
    setMessage("");

    try {
      const result =
        await submitB2BOrderAction({
          shippingAddressId:
            Number(
              shippingAddressId
            ),
          paymentMethod,
          requestedDate:
            requestedDate ||
            null,
          customerNote:
            customerNote.trim() ||
            null,
          items: cart.map(
            (item) => ({
              productId:
                item.productId,
              quantity:
                item.qty,
            })
          ),
        });

      if (!result.success) {
        setMessage(
          result.message
        );
        return;
      }

      clearCart();
      router.replace(
        "/account/orders/" +
          result.orderId +
          "?created=true"
      );
      router.refresh();
    } catch (error) {
      console.error(
        "Sipariş gönderilemedi:",
        error
      );
      setMessage(
        "Sipariş gönderilemedi. Lütfen tekrar deneyin."
      );
    } finally {
      setPending(false);
    }
  }

  if (!isHydrated) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow">
        Sepet yükleniyor...
      </div>
    );
  }

  if (
    cart.length === 0
  ) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow">
        <h2 className="text-2xl font-bold">
          Sepetiniz boş
        </h2>
        <Link
          href="/products"
          className="mt-6 inline-flex rounded-xl bg-blue-900 px-6 py-3 font-bold text-white"
        >
          Ürünleri İncele
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-8 lg:grid-cols-[1fr_380px]"
    >
      <div className="space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">
            Teslimat Adresi
          </h2>

          {addresses.length ===
          0 ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              Aktif teslimat adresiniz bulunmuyor. Sipariş verebilmek için firma yöneticinizden adres tanımlamasını isteyin.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {addresses.map(
                (address) => (
                  <label
                    key={
                      address.id
                    }
                    className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4 hover:border-blue-500"
                  >
                    <input
                      type="radio"
                      name="shippingAddress"
                      value={
                        address.id
                      }
                      checked={
                        shippingAddressId ===
                        String(
                          address.id
                        )
                      }
                      onChange={(
                        event
                      ) =>
                        setShippingAddressId(
                          event.target
                            .value
                        )
                      }
                    />
                    <span>
                      <strong className="block text-slate-900">
                        {address.title}
                        {address.isDefault
                          ? " · Varsayılan"
                          : ""}
                      </strong>
                      <span className="mt-1 block text-sm text-slate-600">
                        {address.address},{" "}
                        {address.district} /{" "}
                        {address.city}
                      </span>
                    </span>
                  </label>
                )
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">
            Ödeme Yöntemi
          </h2>
          <div className="mt-5 space-y-3">
            <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4">
              <input
                type="radio"
                checked={
                  paymentMethod ===
                  "BANK_TRANSFER"
                }
                onChange={() =>
                  setPaymentMethod(
                    "BANK_TRANSFER"
                  )
                }
              />
              <span>
                <strong className="block">
                  Havale / EFT
                </strong>
                <span className="mt-1 block text-sm text-slate-500">
                  Sipariş onayından sonra ödeme bilgileri paylaşılır.
                </span>
              </span>
            </label>

            {creditLimit > 0 ? (
              <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4">
                <input
                  type="radio"
                  checked={
                    paymentMethod ===
                    "CURRENT_ACCOUNT"
                  }
                  onChange={() =>
                    setPaymentMethod(
                      "CURRENT_ACCOUNT"
                    )
                  }
                />
                <span>
                  <strong className="block">
                    Cari Hesap
                  </strong>
                  <span className="mt-1 block text-sm text-slate-500">
                    {paymentTermDays} gün vade · Limit{" "}
                    {formatCurrency(
                      creditLimit
                    )}{" "}
                    ₺
                  </span>
                </span>
              </label>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">
            Teslimat ve Sipariş Notu
          </h2>
          <label className="mt-5 block text-sm font-semibold">
            Talep Edilen Teslim Tarihi
            <input
              type="date"
              value={
                requestedDate
              }
              onChange={(
                event
              ) =>
                setRequestedDate(
                  event.target
                    .value
                )
              }
              className="mt-2 w-full rounded-xl border border-slate-300 p-3"
            />
          </label>

          <label className="mt-5 block text-sm font-semibold">
            Sipariş Notu
            <textarea
              value={customerNote}
              onChange={(
                event
              ) =>
                setCustomerNote(
                  event.target
                    .value
                )
              }
              maxLength={1000}
              rows={4}
              className="mt-2 w-full rounded-xl border border-slate-300 p-3"
              placeholder="Teslimat veya siparişle ilgili notunuz..."
            />
          </label>
        </section>
      </div>

      <aside className="h-fit rounded-2xl bg-white p-6 shadow">
        <h2 className="text-2xl font-bold">
          Sipariş Özeti
        </h2>

        <div className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span>
              Ara Toplam
            </span>
            <strong>
              {formatCurrency(
                totals.subtotal
              )}{" "}
              ₺
            </strong>
          </div>

          {discountRate > 0 ? (
            <div className="flex justify-between gap-4 text-emerald-700">
              <span>
                İskonto %
                {discountRate}
              </span>
              <strong>
                -
                {formatCurrency(
                  totals.discountAmount
                )}{" "}
                ₺
              </strong>
            </div>
          ) : null}

          <div className="flex justify-between gap-4">
            <span>KDV</span>
            <strong>
              {formatCurrency(
                totals.vatAmount
              )}{" "}
              ₺
            </strong>
          </div>

          <hr />

          <div className="flex justify-between gap-4 text-xl">
            <span className="font-bold">
              Genel Toplam
            </span>
            <strong className="text-blue-900">
              {formatCurrency(
                totals.total
              )}{" "}
              ₺
            </strong>
          </div>
        </div>

        {!minimumMet ? (
          <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            Minimum sipariş tutarı KDV hariç{" "}
            {formatCurrency(
              B2B_CONSTANTS
                .MINIMUM_ORDER_NET_AMOUNT
            )}{" "}
            ₺’dir.
          </div>
        ) : null}

        {message ? (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
          >
            {message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={
            pending ||
            !minimumMet ||
            !shippingAddressId
          }
          className="mt-6 w-full rounded-xl bg-blue-900 py-4 font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
        >
          {pending
            ? "Sipariş oluşturuluyor..."
            : "Siparişi Onayla"}
        </button>

        <Link
          href="/cart"
          className="mt-4 block text-center text-sm font-semibold text-blue-900 hover:underline"
        >
          Sepete Dön
        </Link>

        <p className="mt-5 text-xs leading-5 text-slate-500">
          Fiyat, KDV ve stok bilgileri sipariş onayında sunucudan tekrar doğrulanır.
        </p>
      </aside>
    </form>
  );
}

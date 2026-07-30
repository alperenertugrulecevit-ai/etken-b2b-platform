"use client";

import {
  useActionState,
  useEffect,
  useRef,
} from "react";

import {
  createCustomerUserAction,
  type CustomerUserActionState,
} from "@/app/admin/customers/[id]/users/actions";

const INITIAL_CUSTOMER_USER_STATE:
  CustomerUserActionState = {
    success: false,
    message: "",
  };

type Props = {
  customerId: number;
};

export default function CustomerUserCreateForm({
  customerId,
}: Props) {
  const formRef =
    useRef<HTMLFormElement>(null);

  const action =
    createCustomerUserAction.bind(
      null,
      customerId
    );

  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    action,
    INITIAL_CUSTOMER_USER_STATE
  );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [
    state.success,
    state.message,
  ]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-2xl bg-white p-6 shadow"
    >
      <h2 className="text-xl font-bold text-slate-900">
        Yeni Kurumsal Kullanıcı
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        Bu hesap yalnızca B2B müşteri portalına giriş yapabilir.
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Kullanıcı Adı
          <input
            name="username"
            required
            autoCapitalize="none"
            spellCheck={false}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          E-posta
          <input
            name="email"
            type="email"
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
          />
        </label>

        <label className="text-sm font-semibold text-slate-700 md:col-span-2">
          İlk Şifre
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
          />
          <span className="mt-2 block text-xs font-normal text-slate-500">
            En az 8 karakter; büyük harf, küçük harf ve rakam içermelidir.
          </span>
        </label>
      </div>

      {state.message ? (
        <div
          role="status"
          className={
            "mt-5 rounded-xl border px-4 py-3 text-sm font-semibold " +
            (state.success
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700")
          }
        >
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full rounded-xl bg-blue-900 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
      >
        {pending
          ? "Kaydediliyor..."
          : "Kurumsal Kullanıcı Oluştur"}
      </button>
    </form>
  );
}

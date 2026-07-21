"use client";

import {
  useActionState,
  useState,
} from "react";

import {
  changePasswordAction,
  type ChangePasswordState,
} from "@/app/change-password/actions";

import { PASSWORD_POLICY } from "@/modules/auth/constants/password-policy.constants";

type ChangePasswordFormProps = {
  returnTo: "/admin" | "/rf";
};

const initialState: ChangePasswordState = {
  success: false,
  message: "",
};

export default function ChangePasswordForm({
  returnTo,
}: ChangePasswordFormProps) {
  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    changePasswordAction,
    initialState
  );

  const [
    showPasswords,
    setShowPasswords,
  ] = useState(false);

  return (
    <form
      action={formAction}
      className="space-y-6"
    >
      <input
        type="hidden"
        name="returnTo"
        value={returnTo}
      />

      <div>
        <label
          htmlFor="currentPassword"
          className="mb-2 block text-sm font-bold text-slate-700"
        >
          Mevcut Şifre
        </label>

        <input
          id="currentPassword"
          name="currentPassword"
          type={
            showPasswords
              ? "text"
              : "password"
          }
          autoComplete="current-password"
          disabled={isPending}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          required
        />
      </div>

      <div>
        <label
          htmlFor="newPassword"
          className="mb-2 block text-sm font-bold text-slate-700"
        >
          Yeni Şifre
        </label>

        <input
          id="newPassword"
          name="newPassword"
          type={
            showPasswords
              ? "text"
              : "password"
          }
          minLength={
            PASSWORD_POLICY.MIN_LENGTH
          }
          maxLength={
            PASSWORD_POLICY.MAX_LENGTH
          }
          autoComplete="new-password"
          disabled={isPending}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          required
        />

        <p className="mt-2 text-xs leading-5 text-slate-500">
          En az{" "}
          {
            PASSWORD_POLICY.MIN_LENGTH
          }{" "}
          karakter, bir büyük harf, bir
          küçük harf, bir rakam ve bir
          özel karakter kullanın.
        </p>
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-2 block text-sm font-bold text-slate-700"
        >
          Yeni Şifre Tekrarı
        </label>

        <input
          id="confirmPassword"
          name="confirmPassword"
          type={
            showPasswords
              ? "text"
              : "password"
          }
          minLength={
            PASSWORD_POLICY.MIN_LENGTH
          }
          maxLength={
            PASSWORD_POLICY.MAX_LENGTH
          }
          autoComplete="new-password"
          disabled={isPending}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          required
        />
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={showPasswords}
          onChange={(event) =>
            setShowPasswords(
              event.target.checked
            )
          }
          disabled={isPending}
        />

        Şifreleri göster
      </label>

      {state.message && (
        <div
          role="alert"
          className={`rounded-xl border p-4 text-sm font-semibold ${
            state.success
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-blue-900 px-5 py-4 font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isPending
          ? "Şifre Değiştiriliyor..."
          : "Şifremi Değiştir"}
      </button>
    </form>
  );
}
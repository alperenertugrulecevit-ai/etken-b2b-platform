"use client";

import {
  type FormEvent,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  resetPasswordAction,
} from "@/app/reset-password/actions";
import {
  PASSWORD_POLICY,
} from "@/modules/auth/constants/password-policy.constants";

type ResetPasswordFormProps = {
  token: string;
};

export default function ResetPasswordForm({
  token,
}: ResetPasswordFormProps) {
  const router = useRouter();
  const [
    newPassword,
    setNewPassword,
  ] = useState("");
  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");
  const [
    showPasswords,
    setShowPasswords,
  ] = useState(false);
  const [
    message,
    setMessage,
  ] = useState("");
  const [
    pending,
    setPending,
  ] = useState(false);

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setMessage("");
    setPending(true);

    try {
      const result =
        await resetPasswordAction(
          token,
          newPassword,
          confirmPassword,
        );

      if (!result.success) {
        setMessage(
          result.message,
        );
        return;
      }

      router.replace(
        "/customer-login?passwordReset=true",
      );
      router.refresh();
    } catch (error) {
      console.error(
        "Şifre sıfırlanamadı:",
        error,
      );
      setMessage(
        "Şifre sıfırlanamadı. Lütfen yeniden deneyin.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <div>
        <label
          htmlFor="reset-new-password"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Yeni Şifre
        </label>

        <input
          id="reset-new-password"
          type={
            showPasswords
              ? "text"
              : "password"
          }
          required
          minLength={
            PASSWORD_POLICY.MIN_LENGTH
          }
          maxLength={
            PASSWORD_POLICY.MAX_LENGTH
          }
          autoComplete="new-password"
          disabled={pending}
          value={newPassword}
          onChange={(event) =>
            setNewPassword(
              event.target.value,
            )
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 disabled:bg-slate-100"
        />

        <p className="mt-2 text-xs leading-5 text-slate-500">
          En az {PASSWORD_POLICY.MIN_LENGTH} karakter, bir büyük harf,
          bir küçük harf, bir rakam ve bir özel karakter kullanın.
        </p>
      </div>

      <div>
        <label
          htmlFor="reset-confirm-password"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Yeni Şifre Tekrarı
        </label>

        <input
          id="reset-confirm-password"
          type={
            showPasswords
              ? "text"
              : "password"
          }
          required
          minLength={
            PASSWORD_POLICY.MIN_LENGTH
          }
          maxLength={
            PASSWORD_POLICY.MAX_LENGTH
          }
          autoComplete="new-password"
          disabled={pending}
          value={confirmPassword}
          onChange={(event) =>
            setConfirmPassword(
              event.target.value,
            )
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 disabled:bg-slate-100"
        />
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={showPasswords}
          onChange={(event) =>
            setShowPasswords(
              event.target.checked,
            )
          }
          disabled={pending}
        />
        Şifreleri göster
      </label>

      {message ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-blue-900 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {pending
          ? "Şifre değiştiriliyor..."
          : "Yeni Şifreyi Kaydet"}
      </button>
    </form>
  );
}

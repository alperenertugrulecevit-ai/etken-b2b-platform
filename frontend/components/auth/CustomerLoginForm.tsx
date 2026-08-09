"use client";

import {
  type FormEvent,
  useState,
} from "react";
import Link from "next/link";
import {
  useRouter,
} from "next/navigation";

import {
  customerLoginAction,
} from "@/app/customer-login/actions";

type CustomerLoginFormProps = {
  successMessage?: string;
};

export default function CustomerLoginForm({
  successMessage = "",
}: CustomerLoginFormProps) {
  const router = useRouter();
  const [
    username,
    setUsername,
  ] = useState("");
  const [
    password,
    setPassword,
  ] = useState("");
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
        await customerLoginAction(
          username,
          password,
        );

      if (!result.success) {
        setMessage(
          result.message,
        );
        return;
      }

const destination =
  result.mustChangePassword
    ? "/change-password?returnTo=%2F"
    : "/";

      router.replace(
        destination,
      );
      router.refresh();
    } catch (error) {
      console.error(
        "Müşteri girişi tamamlanamadı:",
        error,
      );
      setMessage(
        "Giriş işlemi tamamlanamadı. Lütfen tekrar deneyin.",
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
      {successMessage ? (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800"
        >
          {successMessage}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="customer-username"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Kullanıcı Adı
        </label>

        <input
          id="customer-username"
          type="text"
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          disabled={pending}
          value={username}
          onChange={(event) =>
            setUsername(
              event.target.value,
            )
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 disabled:bg-slate-100"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label
            htmlFor="customer-password"
            className="block text-sm font-semibold text-slate-700"
          >
            Şifre
          </label>

          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-blue-900 hover:underline"
          >
            Şifremi Unuttum
          </Link>
        </div>

        <input
          id="customer-password"
          type="password"
          required
          autoComplete="current-password"
          disabled={pending}
          value={password}
          onChange={(event) =>
            setPassword(
              event.target.value,
            )
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 disabled:bg-slate-100"
        />
      </div>

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
          ? "Giriş yapılıyor..."
          : "Kurumsal Hesabıma Giriş Yap"}
      </button>
    </form>
  );
}

"use client";

import {
  type FormEvent,
  useState,
} from "react";
import Link from "next/link";

import {
  requestPasswordResetAction,
} from "@/app/forgot-password/actions";

export default function ForgotPasswordForm() {
  const [
    identifier,
    setIdentifier,
  ] = useState("");
  const [
    message,
    setMessage,
  ] = useState("");
  const [
    developmentResetUrl,
    setDevelopmentResetUrl,
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
    setDevelopmentResetUrl("");
    setPending(true);

    try {
      const result =
        await requestPasswordResetAction(
          identifier,
        );

      setMessage(result.message);
      setDevelopmentResetUrl(
        result.developmentResetUrl ??
          "",
      );
    } catch (error) {
      console.error(
        "Şifre sıfırlama talebi tamamlanamadı:",
        error,
      );
      setMessage(
        "Talep alınamadı. Lütfen yeniden deneyin.",
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
          htmlFor="reset-identifier"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Kullanıcı Adı veya E-posta
        </label>

        <input
          id="reset-identifier"
          type="text"
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          disabled={pending}
          value={identifier}
          onChange={(event) =>
            setIdentifier(
              event.target.value,
            )
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 disabled:bg-slate-100"
        />
      </div>

      {message ? (
        <div
          role="status"
          className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold leading-6 text-blue-900"
        >
          {message}
        </div>
      ) : null}

      {developmentResetUrl ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <strong>
            Yerel test bağlantısı:
          </strong>

          <p className="mt-2 break-all">
            <Link
              href={
                developmentResetUrl
              }
              className="font-semibold text-blue-900 underline"
            >
              Şifre sıfırlama ekranını aç
            </Link>
          </p>

          <p className="mt-2 text-xs">
            Bu bağlantı yalnızca geliştirme ortamında gösterilir.
          </p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-blue-900 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {pending
          ? "Talep hazırlanıyor..."
          : "Şifre Sıfırlama Bağlantısı İste"}
      </button>
    </form>
  );
}

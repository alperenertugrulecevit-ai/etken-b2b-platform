"use client";

import {
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { loginAction } from "@/modules/auth/actions/login.action";

type LoginFormProps = {
  isRfLogin?: boolean;
};

export default function LoginForm({
  isRfLogin = false,
}: LoginFormProps) {
  const router = useRouter();

  const [username, setUsername] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [errorMessage, setErrorMessage] =
    useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const result = await loginAction(
        username,
        password,
        isRfLogin
      );

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      router.replace(
        isRfLogin ? "/rf" : "/admin"
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Giriş işlemi sırasında hata oluştu:",
        error
      );

      setErrorMessage(
        "Giriş işlemi tamamlanamadı. Lütfen tekrar deneyin."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div>
        <label
          htmlFor="username"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Kullanıcı Adı
        </label>

        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          disabled={isSubmitting}
          value={username}
          onChange={(event) =>
            setUsername(event.target.value)
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 disabled:cursor-not-allowed disabled:bg-slate-100"
          placeholder="Kullanıcı adınızı girin"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Şifre
        </label>

        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isSubmitting}
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 disabled:cursor-not-allowed disabled:bg-slate-100"
          placeholder="Şifrenizi girin"
        />
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {errorMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-blue-900 px-5 py-3 font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSubmitting
          ? "Giriş yapılıyor..."
          : isRfLogin
            ? "RF Terminale Giriş Yap"
            : "Yönetim Paneline Giriş Yap"}
      </button>
    </form>
  );
}
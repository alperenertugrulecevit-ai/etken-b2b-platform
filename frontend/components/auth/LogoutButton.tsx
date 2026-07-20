"use client";

import {
  useState,
  useTransition,
} from "react";

import { logoutAction } from "@/modules/auth/actions/logout.action";

type Props = {
  redirectTo: "/login" | "/rf/login";
  label?: string;
  className?: string;
};

export default function LogoutButton({
  redirectTo,
  label = "Çıkış Yap",
  className,
}: Props) {
  const [isPending, startTransition] =
    useTransition();

  const [errorMessage, setErrorMessage] =
    useState("");

  function handleLogout() {
    setErrorMessage("");

    startTransition(async () => {
      try {
        const result = await logoutAction();

        if (!result.success) {
          setErrorMessage(
            "Oturum kapatılamadı."
          );
          return;
        }

        window.location.assign(redirectTo);
      } catch (error) {
        console.error(
          "Oturum kapatma hatası:",
          error
        );

        setErrorMessage(
          "Çıkış işlemi tamamlanamadı."
        );
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        className={
          className ??
          "rounded-xl bg-red-600 px-4 py-2 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        }
      >
        {isPending
          ? "Çıkış yapılıyor..."
          : label}
      </button>

      {errorMessage && (
        <p className="mt-2 text-xs font-semibold text-red-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
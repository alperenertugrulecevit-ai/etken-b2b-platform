"use client";

import { useState } from "react";

export default function CustomerLogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/public/customer-logout", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        redirect: "manual",
      });

      if (response.status !== 303 && response.type !== "opaqueredirect") {
        throw new Error(`Logout failed with status ${response.status}`);
      }

      window.location.assign("/");
    } catch (error) {
      console.error("Müşteri oturumu kapatılamadı:", error);
      setIsLoggingOut(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="rounded-lg bg-[#202B38] px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
    >
      {isLoggingOut ? "Çıkış yapılıyor..." : "Güvenli Çıkış"}
    </button>
  );
}

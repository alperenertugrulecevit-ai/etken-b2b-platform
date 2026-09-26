"use client";

import { usePathname, useRouter } from "next/navigation";

export default function RFGlobalBackButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (
    pathname === "/rf" ||
    pathname === "/rf/login"
  ) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/rf");
        }
      }}
      className="mb-4 inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 py-2 font-black text-slate-800 shadow-sm active:scale-[0.98]"
    >
      ← Geri
    </button>
  );
}

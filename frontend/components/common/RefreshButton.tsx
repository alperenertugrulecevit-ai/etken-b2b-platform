"use client";

import {
  useRouter,
} from "next/navigation";
import {
  useTransition,
} from "react";

type RefreshButtonProps = {
  className?: string;
};

export default function RefreshButton({
  className = "",
}: RefreshButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] =
    useTransition();

  function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isPending}
      className={`inline-flex items-center justify-center rounded-xl border border-blue-900 bg-white px-5 py-3 font-bold text-blue-900 transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60 ${className}`}
    >
      <span
        className={
          isPending
            ? "mr-2 inline-block animate-spin"
            : "mr-2 inline-block"
        }
        aria-hidden="true"
      >
        ↻
      </span>

      {isPending
        ? "Yenileniyor..."
        : "Yenile"}
    </button>
  );
}
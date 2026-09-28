"use client";

import { useState } from "react";
import { claimZoneTaskById } from "@/app/rf/zone-picking/actions";

export default function ClaimZoneTaskButton({ taskId }: { taskId: string }) {
  const [pending, setPending] = useState(false);

  async function selectTask() {
    if (pending) return;
    setPending(true);
    try {
      const data = new FormData();
      data.set("taskId", taskId);
      const result = await claimZoneTaskById(data);
      if (result?.taskId) {
        // Server-action redirect/RSC cache yerine tam navigasyon yap.
        // Böylece yeni atanmış görevin kaynak/hedef verileri ilk açılışta kesin yüklenir.
        window.location.assign(
          `/rf/picking?zoneTaskId=${encodeURIComponent(result.taskId)}`,
        );
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={selectTask}
      disabled={pending}
      className="shrink-0 rounded-xl bg-blue-900 px-4 py-3 font-black text-white disabled:opacity-50"
    >
      {pending ? "AÇILIYOR..." : "SEÇ"}
    </button>
  );
}

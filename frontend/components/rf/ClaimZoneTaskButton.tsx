"use client";

import { useState } from "react";
import { claimZoneTaskById } from "@/app/rf/zone-picking/actions";

export default function ClaimZoneTaskButton({
  taskId,
  flow,
}: {
  taskId: string;
  flow?: "wave" | "direct";
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function selectTask() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const data = new FormData();
      data.set("taskId", taskId);
      const result = await claimZoneTaskById(data);
      if (!result?.taskId) {
        setError("Toplama görevi seçilemedi.");
        return;
      }
      const suffix = flow === "wave" ? "&flow=wave" : "";
      window.location.href =
        `/rf/picking?zoneTaskId=${encodeURIComponent(result.taskId)}${suffix}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toplama görevi seçilemedi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={selectTask}
        disabled={pending}
        className="shrink-0 rounded-xl bg-blue-900 px-4 py-3 font-black text-white disabled:opacity-50"
      >
        {pending ? "AÇILIYOR..." : "SEÇ"}
      </button>
      {error ? (
        <p className="max-w-72 text-right text-xs font-bold text-red-700">{error}</p>
      ) : null}
    </div>
  );
}

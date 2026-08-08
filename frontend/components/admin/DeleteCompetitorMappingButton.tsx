"use client";

import { useState } from "react";

import {
  deleteCompetitorMapping,
} from "@/app/admin/competitor-prices/mappings/actions";

type DeleteCompetitorMappingButtonProps = {
  mappingId: number;
};

export default function DeleteCompetitorMappingButton({
  mappingId,
}: DeleteCompetitorMappingButtonProps) {
  const [confirming, setConfirming] =
    useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() =>
          setConfirming(true)
        }
        className="rounded-lg bg-slate-700 px-4 py-2 font-bold text-white transition hover:bg-slate-800"
      >
        Sil
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <form
        action={deleteCompetitorMapping.bind(
          null,
          mappingId,
        )}
      >
        <button
          type="submit"
          className="rounded-lg bg-red-700 px-4 py-2 font-bold text-white transition hover:bg-red-800"
        >
          Evet, Sil
        </button>
      </form>

      <button
        type="button"
        onClick={() =>
          setConfirming(false)
        }
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700 transition hover:bg-slate-50"
      >
        Vazgeç
      </button>
    </div>
  );
}
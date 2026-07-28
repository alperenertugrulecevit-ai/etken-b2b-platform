"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  changeWmsContextAction,
  type WmsContextActionState,
} from "@/app/wms-context/actions";

import type {
  ActiveWmsContext,
  WmsContextCompanyOption,
} from "@/modules/wms-context/types/wms-context.types";

type Props = {
  activeContext:
    ActiveWmsContext | null;
  companies:
    WmsContextCompanyOption[];
  variant?: "admin" | "rf";
};

const initialState:
  WmsContextActionState = {
    success: false,
    message: "",
  };

export default function WmsContextSelector({
  activeContext,
  companies,
  variant = "admin",
}: Props) {
  const router = useRouter();

  const [
    selectedCompanyId,
    setSelectedCompanyId,
  ] = useState(
    activeContext?.companyId ??
      companies[0]?.id ??
      ""
  );

  const [
    selectedWarehouseId,
    setSelectedWarehouseId,
  ] = useState(
    String(
      activeContext?.warehouseId ??
        ""
    )
  );

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    changeWmsContextAction,
    initialState
  );

  const selectedCompany =
    useMemo(
      () =>
        companies.find(
          (company) =>
            company.id ===
            selectedCompanyId
        ) ?? null,
      [
        companies,
        selectedCompanyId,
      ]
    );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [
    router,
    state.success,
    state.message,
  ]);

  function handleCompanyChange(
    companyId: string
  ) {
    setSelectedCompanyId(
      companyId
    );

    const company =
      companies.find(
        (item) =>
          item.id === companyId
      );

    setSelectedWarehouseId(
      String(
        company?.warehouses[0]
          ?.id ?? ""
      )
    );
  }

  const isRf =
    variant === "rf";

  const panelClass = isRf
    ? "border-slate-700 bg-slate-800"
    : "border-blue-200 bg-blue-50";

  const labelClass = isRf
    ? "text-slate-300"
    : "text-blue-900";

  if (
    companies.length === 0
  ) {
    return (
      <div
        className={
          "rounded-xl border px-4 py-3 text-sm font-bold " +
          (
            isRf
              ? "border-amber-700 bg-amber-950 text-amber-200"
              : "border-amber-200 bg-amber-50 text-amber-800"
          )
        }
      >
        Aktif şirket/depo erişimi bulunmuyor.
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className={
        "rounded-xl border p-3 " +
        panelClass
      }
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span
            className={
              "mb-1 block text-[10px] font-black uppercase tracking-wider " +
              labelClass
            }
          >
            Aktif Şirket
          </span>

          <select
            name="companyId"
            value={
              selectedCompanyId
            }
            onChange={(event) =>
              handleCompanyChange(
                event.target.value
              )
            }
            className="min-w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-950"
            required
          >
            {companies.map(
              (company) => (
                <option
                  key={company.id}
                  value={company.id}
                >
                  {company.code} -{" "}
                  {company.name}
                </option>
              )
            )}
          </select>
        </label>

        <label className="block">
          <span
            className={
              "mb-1 block text-[10px] font-black uppercase tracking-wider " +
              labelClass
            }
          >
            Aktif Depo
          </span>

          <select
            name="warehouseId"
            value={
              selectedWarehouseId
            }
            onChange={(event) =>
              setSelectedWarehouseId(
                event.target.value
              )
            }
            className="min-w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-950"
            required
          >
            <option value="">
              Depo seçin
            </option>

            {selectedCompany
              ?.warehouses.map(
                (warehouse) => (
                  <option
                    key={
                      warehouse.id
                    }
                    value={
                      warehouse.id
                    }
                  >
                    {
                      warehouse.code
                    }{" "}
                    -{" "}
                    {
                      warehouse.name
                    }
                  </option>
                )
              )}
          </select>
        </label>

        <button
          type="submit"
          disabled={
            isPending ||
            !selectedWarehouseId
          }
          className={
            "rounded-lg px-4 py-2 text-sm font-black text-white " +
            (
              isPending
                ? "cursor-not-allowed bg-slate-400"
                : isRf
                  ? "bg-cyan-700 hover:bg-cyan-600"
                  : "bg-blue-900 hover:bg-blue-800"
            )
          }
        >
          {isPending
            ? "Geçiliyor..."
            : "Uygula"}
        </button>
      </div>

      {activeContext && (
        <p
          className={
            "mt-2 text-xs " +
            (
              isRf
                ? "text-slate-400"
                : "text-slate-600"
            )
          }
        >
          Merkez:{" "}
          <strong>
            {
              activeContext
                .logisticsCenterCode
            }{" "}
            -{" "}
            {
              activeContext
                .logisticsCenterName
            }
          </strong>
        </p>
      )}

      {state.message && (
        <p
          role="status"
          className={
            "mt-2 text-xs font-bold " +
            (
              state.success
                ? isRf
                  ? "text-green-300"
                  : "text-green-700"
                : isRf
                  ? "text-red-300"
                  : "text-red-700"
            )
          }
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

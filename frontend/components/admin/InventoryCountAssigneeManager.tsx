"use client";

import {
  useState,
} from "react";

import {
  useFormStatus,
} from "react-dom";

import {
  addInventoryCountAssigneesAction,
} from "@/app/admin/inventory-counts/[id]/actions";

export type AvailableInventoryCountAssignee = {
  userId: string;
  username: string;
  employeeCode: string;
  fullName: string;
  department: string;
  title: string;
};

type InventoryCountAssigneeManagerProps = {
  inventoryCountId: number;

  status:
    | "DRAFT"
    | "ACTIVE"
    | "IN_PROGRESS"
    | "SUBMITTED"
    | "APPROVED"
    | "CANCELLED";

  canManage: boolean;

  availableAssignees:
    AvailableInventoryCountAssignee[];
};

function SubmitButton({
  selectedCount,
}: {
  selectedCount: number;
}) {
  const {
    pending,
  } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={
        pending ||
        selectedCount === 0
      }
      className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending
        ? "Personeller ekleniyor..."
        : `${selectedCount} Personeli Sayıma Ekle`}
    </button>
  );
}

export default function InventoryCountAssigneeManager({
  inventoryCountId,
  status,
  canManage,
  availableAssignees,
}: InventoryCountAssigneeManagerProps) {
  const [
    selectedUserIds,
    setSelectedUserIds,
  ] = useState<string[]>([]);

  const addAssigneesAction =
    addInventoryCountAssigneesAction.bind(
      null,
      inventoryCountId
    );

  const canAddAssignee =
    status === "DRAFT" ||
    status === "ACTIVE" ||
    status === "IN_PROGRESS";

  const allSelected =
    availableAssignees.length >
      0 &&
    availableAssignees.every(
      (assignee) =>
        selectedUserIds.includes(
          assignee.userId
        )
    );

  function toggleAssignee(
    userId: string
  ) {
    setSelectedUserIds(
      (currentIds) =>
        currentIds.includes(
          userId
        )
          ? currentIds.filter(
              (currentId) =>
                currentId !==
                userId
            )
          : [
              ...currentIds,
              userId,
            ]
    );
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedUserIds(
        []
      );

      return;
    }

    setSelectedUserIds(
      availableAssignees.map(
        (assignee) =>
          assignee.userId
      )
    );
  }

  if (
    !canManage ||
    !canAddAssignee
  ) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Personel Yönetimi
          </p>

          <h2 className="mt-2 text-xl font-black text-emerald-950">
            Sayıma Personel Ekle
          </h2>

          <p className="mt-2 text-sm leading-6 text-emerald-900">
            Sayıma daha önce
            atanmamış personellerden
            bir veya birden fazlasını
            seçebilirsiniz.
          </p>
        </div>

        {availableAssignees.length >
          0 && (
          <button
            type="button"
            onClick={
              toggleAll
            }
            className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100"
          >
            {allSelected
              ? "Seçimi Temizle"
              : "Tümünü Seç"}
          </button>
        )}
      </div>

      {availableAssignees.length ===
      0 ? (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-white p-4 text-sm font-semibold leading-6 text-emerald-900">
          Sistemdeki bütün aktif
          personeller bu sayıma
          atanmış durumda.
        </div>
      ) : (
        <form
          action={
            addAssigneesAction
          }
          className="mt-5 space-y-4"
          onSubmit={(
            event
          ) => {
            if (
              selectedUserIds.length ===
              0
            ) {
              event.preventDefault();
              return;
            }

            const confirmed =
              window.confirm(
                `${selectedUserIds.length} personeli bu sayıma eklemek istiyor musunuz?`
              );

            if (!confirmed) {
              event.preventDefault();
            }
          }}
        >
          <input
            type="hidden"
            name="assignedUserIds"
            value={JSON.stringify(
              selectedUserIds
            )}
          />

          <div className="max-h-96 space-y-2 overflow-y-auto rounded-2xl border border-emerald-200 bg-white p-3">
            {availableAssignees.map(
              (assignee) => {
                const checked =
                  selectedUserIds.includes(
                    assignee.userId
                  );

                return (
                  <label
                    key={
                      assignee.userId
                    }
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                      checked
                        ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20"
                        : "border-slate-200 bg-white hover:border-emerald-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={
                        checked
                      }
                      onChange={() =>
                        toggleAssignee(
                          assignee.userId
                        )
                      }
                      className="mt-1 h-5 w-5"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="font-black text-slate-900">
                        {
                          assignee.fullName
                        }
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-600">
                        @
                        {
                          assignee.username
                        }
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                          Sicil:{" "}
                          {
                            assignee.employeeCode
                          }
                        </span>

                        {assignee.department && (
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">
                            {
                              assignee.department
                            }
                          </span>
                        )}

                        {assignee.title && (
                          <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-bold text-violet-700">
                            {
                              assignee.title
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              }
            )}
          </div>

          <div className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-700">
            {
              selectedUserIds.length
            }{" "}
            personel seçildi.
          </div>

          <SubmitButton
            selectedCount={
              selectedUserIds.length
            }
          />
        </form>
      )}
    </section>
  );
}
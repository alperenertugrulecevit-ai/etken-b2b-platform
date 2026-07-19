"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  createRoleAction,
  updateRoleAction,
} from "@/app/admin/roles/actions";

import type {
  PermissionGroup,
  RoleFormActionState,
  RoleFormValues,
} from "@/modules/roles/types/role.types";

type Props = {
  mode: "create" | "edit";
  roleId?: string;
  permissionGroups: PermissionGroup[];
  initialValues: RoleFormValues;
};

function FieldError({
  state,
  field,
}: {
  state: RoleFormActionState;
  field: string;
}) {
  if (state.field !== field) {
    return null;
  }

  return (
    <p className="mt-2 text-sm font-semibold text-red-700">
      {state.message}
    </p>
  );
}

export default function RoleForm({
  mode,
  roleId,
  permissionGroups,
  initialValues,
}: Props) {
  const initialState: RoleFormActionState = {
    success: false,
    message: "",
    field: null,
    values: initialValues,
  };

  const action =
    mode === "create"
      ? createRoleAction
      : updateRoleAction;

  const [state, formAction, isPending] =
    useActionState(action, initialState);

  const values = state.values ?? initialValues;

  return (
    <form action={formAction} className="space-y-6">
      {roleId && (
        <input
          type="hidden"
          name="roleId"
          value={roleId}
        />
      )}

      {state.message && !state.field && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800">
          {state.message}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">
          Rol Bilgileri
        </h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="font-semibold text-slate-700">
              Rol kodu *
            </span>
            <input
              name="code"
              required
              minLength={3}
              maxLength={50}
              defaultValue={values.code}
              placeholder="DEPO_OPERATORU"
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 uppercase outline-none focus:border-blue-600"
            />
            <p className="mt-2 text-xs text-slate-500">
              Büyük harf, rakam ve alt çizgi kullanın.
            </p>
            <FieldError state={state} field="code" />
          </label>

          <label className="block">
            <span className="font-semibold text-slate-700">
              Rol adı *
            </span>
            <input
              name="name"
              required
              minLength={3}
              maxLength={80}
              defaultValue={values.name}
              placeholder="Depo Operatörü"
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-600"
            />
            <FieldError state={state} field="name" />
          </label>

          <label className="block md:col-span-2">
            <span className="font-semibold text-slate-700">
              Açıklama
            </span>
            <textarea
              name="description"
              rows={3}
              maxLength={300}
              defaultValue={values.description}
              placeholder="Bu rolün görev ve sorumluluklarını açıklayın."
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
            />
            <FieldError
              state={state}
              field="description"
            />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">
          Yetkiler
        </h2>

        <p className="mt-1 text-slate-500">
          Bu role atanacak operasyon ve görüntüleme
          yetkilerini seçin. En az bir yetki gereklidir.
        </p>

        {permissionGroups.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            Yetki kataloğu hazır değil. Önce Rol ve Yetki
            Yönetimi ekranına dönüp “Yetki Kataloğunu
            Eşitle” işlemini çalıştırın.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {permissionGroups.map((group) => (
              <div
                key={group.module}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <h3 className="font-bold text-slate-950">
                  {group.moduleLabel}
                </h3>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {group.permissions.map(
                    (permission) => (
                      <label
                        key={permission.id}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:bg-blue-50/40"
                      >
                        <input
                          name="permissionIds"
                          type="checkbox"
                          value={permission.id}
                          defaultChecked={values.permissionIds.includes(
                            permission.id
                          )}
                          className="mt-1 h-5 w-5"
                        />

                        <span>
                          <strong className="block text-slate-900">
                            {permission.name}
                          </strong>
                          <code className="mt-1 block text-xs font-bold text-blue-700">
                            {permission.code}
                          </code>
                          <span className="mt-2 block text-sm text-slate-500">
                            {permission.description ||
                              "Açıklama tanımlanmamış."}
                          </span>
                        </span>
                      </label>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <FieldError
          state={state}
          field="permissionIds"
        />
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <Link
          href="/admin/roles"
          className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-700 hover:bg-slate-50"
        >
          Vazgeç
        </Link>

        <button
          type="submit"
          disabled={
            isPending ||
            permissionGroups.length === 0
          }
          className="rounded-xl bg-blue-700 px-7 py-3 font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPending
            ? "Kaydediliyor..."
            : mode === "create"
              ? "Rolü Oluştur"
              : "Rolü Güncelle"}
        </button>
      </div>
    </form>
  );
}
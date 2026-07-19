"use client";

import Link from "next/link";
import { useActionState } from "react";

import type {
  UserStatus,
  UserType,
} from "@prisma/client";

import { updateUserAction } from "@/app/admin/users/[id]/actions";
import {
  USER_STATUS_LABELS,
  USER_TYPE_LABELS,
} from "@/modules/users/types/user.types";
import { INITIAL_UPDATE_USER_ACTION_STATE } from "@/modules/users/types/update-user.types";

import type {
  UpdateUserActionState,
  UserEditData,
  UserEditRole,
} from "@/modules/users/types/update-user.types";

type Props = {
  user: UserEditData;
  roles: UserEditRole[];
};

const USER_TYPES: UserType[] = [
  "ADMIN",
  "OFFICE",
  "WAREHOUSE",
  "RF_OPERATOR",
  "SYSTEM",
  "API",
];

const USER_STATUSES: UserStatus[] = [
  "ACTIVE",
  "PASSIVE",
  "LOCKED",
  "SUSPENDED",
];

function FieldError({
  state,
  field,
}: {
  state: UpdateUserActionState;
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

export default function UserEditForm({
  user,
  roles,
}: Props) {
  const [state, formAction, isPending] =
    useActionState(
      updateUserAction,
      INITIAL_UPDATE_USER_ACTION_STATE
    );

  const values = state.values ?? user;

  return (
    <form
      action={formAction}
      className="space-y-6"
    >
      <input
        type="hidden"
        name="userId"
        value={user.id}
      />

      {state.message && !state.field && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800">
          {state.message}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">
          Personel Bilgileri
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Kullanıcıya bağlı personel kaydının kimlik ve
          çalışma bilgilerini düzenleyin.
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <label className="block">
            <span className="font-semibold text-slate-700">
              Personel kodu *
            </span>

            <input
              name="employeeCode"
              required
              maxLength={30}
              defaultValue={values.employeeCode}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 uppercase outline-none focus:border-blue-600"
            />

            <FieldError
              state={state}
              field="employeeCode"
            />
          </label>

          <label className="block">
            <span className="font-semibold text-slate-700">
              Ad *
            </span>

            <input
              name="firstName"
              required
              maxLength={60}
              defaultValue={values.firstName}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-600"
            />

            <FieldError
              state={state}
              field="firstName"
            />
          </label>

          <label className="block">
            <span className="font-semibold text-slate-700">
              Soyad *
            </span>

            <input
              name="lastName"
              required
              maxLength={60}
              defaultValue={values.lastName}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-600"
            />

            <FieldError
              state={state}
              field="lastName"
            />
          </label>

          <label className="block">
            <span className="font-semibold text-slate-700">
              E-posta
            </span>

            <input
              name="email"
              type="email"
              defaultValue={values.email}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-600"
            />

            <FieldError
              state={state}
              field="email"
            />
          </label>

          <label className="block">
            <span className="font-semibold text-slate-700">
              Telefon
            </span>

            <input
              name="phone"
              defaultValue={values.phone}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-600"
            />
          </label>

          <label className="block">
            <span className="font-semibold text-slate-700">
              Departman
            </span>

            <input
              name="department"
              defaultValue={values.department}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-600"
            />
          </label>

          <label className="block">
            <span className="font-semibold text-slate-700">
              Ünvan
            </span>

            <input
              name="title"
              defaultValue={values.title}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-600"
            />
          </label>

          <label className="block">
            <span className="font-semibold text-slate-700">
              Vardiya kodu
            </span>

            <input
              name="shiftCode"
              defaultValue={values.shiftCode}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 uppercase outline-none focus:border-blue-600"
            />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">
          Hesap Bilgileri
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Kullanıcının giriş adını, tipini ve hesap
          durumunu yönetin.
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <label className="block">
            <span className="font-semibold text-slate-700">
              Kullanıcı adı *
            </span>

            <input
              name="username"
              required
              minLength={3}
              maxLength={50}
              autoComplete="off"
              defaultValue={values.username}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 lowercase outline-none focus:border-blue-600"
            />

            <FieldError
              state={state}
              field="username"
            />
          </label>

          <label className="block">
            <span className="font-semibold text-slate-700">
              Kullanıcı tipi *
            </span>

            <select
              name="userType"
              required
              defaultValue={values.userType}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4"
            >
              {USER_TYPES.map((userType) => (
                <option
                  key={userType}
                  value={userType}
                >
                  {USER_TYPE_LABELS[userType]}
                </option>
              ))}
            </select>

            <FieldError
              state={state}
              field="userType"
            />
          </label>

          <label className="block">
            <span className="font-semibold text-slate-700">
              Hesap durumu *
            </span>

            <select
              name="status"
              required
              defaultValue={values.status}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4"
            >
              {USER_STATUSES.map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {USER_STATUS_LABELS[status]}
                </option>
              ))}
            </select>

            <FieldError
              state={state}
              field="status"
            />

            <p className="mt-2 text-xs text-slate-500">
              Aktif dışındaki durumlar kullanıcının açık
              oturumlarını sonlandırır.
            </p>
          </label>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
            <input
              name="isRfUser"
              type="checkbox"
              defaultChecked={values.isRfUser}
              className="mt-1 h-5 w-5"
            />

            <span>
              <strong className="block text-cyan-900">
                RF erişimi açık
              </strong>

              <span className="mt-1 block text-sm text-cyan-700">
                Kullanıcı RF giriş ekranından depo
                işlemlerine erişebilir.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <input
              name="isAdminUser"
              type="checkbox"
              defaultChecked={values.isAdminUser}
              className="mt-1 h-5 w-5"
            />

            <span>
              <strong className="block text-violet-900">
                Yönetici kullanıcı
              </strong>

              <span className="mt-1 block text-sm text-violet-700">
                Bu seçenek işaretliyse SYSTEM_ADMIN rolü
                de seçili olmalıdır.
              </span>
            </span>
          </label>
        </div>

        <FieldError
          state={state}
          field="isAdminUser"
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">
          Rol Atamaları
        </h2>

        <p className="mt-1 text-slate-500">
          Kullanıcının erişebileceği görev ve yetki
          gruplarını seçin.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <label
              key={role.id}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 hover:border-blue-300 hover:bg-blue-50/40"
            >
              <input
                name="roleIds"
                type="checkbox"
                value={role.id}
                defaultChecked={values.roleIds.includes(
                  role.id
                )}
                className="mt-1 h-5 w-5"
              />

              <span>
                <span className="flex flex-wrap items-center gap-2">
                  <strong className="text-slate-900">
                    {role.name}
                  </strong>

                  {role.isSystemRole && (
                    <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-bold text-violet-700">
                      Sistem
                    </span>
                  )}
                </span>

                <code className="mt-1 block text-xs font-bold text-blue-700">
                  {role.code}
                </code>

                <span className="mt-2 block text-sm text-slate-500">
                  {role.description ||
                    "Açıklama tanımlanmamış."}
                </span>
              </span>
            </label>
          ))}

          {roles.length === 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 md:col-span-2 xl:col-span-3">
              Kullanıcıya atanabilecek aktif rol
              bulunamadı.
            </div>
          )}
        </div>

        <FieldError
          state={state}
          field="roleIds"
        />
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <Link
          href="/admin/users"
          className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-700 hover:bg-slate-50"
        >
          Vazgeç
        </Link>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-blue-700 px-7 py-3 font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPending
            ? "Kullanıcı güncelleniyor..."
            : "Değişiklikleri Kaydet"}
        </button>
      </div>
    </form>
  );
}
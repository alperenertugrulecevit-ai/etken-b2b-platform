"use client";

import Link from "next/link";
import {
  useActionState,
  useState,
} from "react";

import type {
  UserType,
} from "@prisma/client";

import { createUserAction } from "@/app/admin/users/new/actions";
import { USER_TYPE_LABELS } from "@/modules/users/types/user.types";

import type {
  AssignableRole,
  CreateUserActionState,
} from "@/modules/users/types/create-user.types";

type Props = {
  roles: AssignableRole[];
};

const initialState: CreateUserActionState = {
  success: false,
  message: "",
  field: null,
  result: null,
  values: null,
};

const USER_TYPES: UserType[] = [
  "ADMIN",
  "OFFICE",
  "WAREHOUSE",
  "RF_OPERATOR",
  "SYSTEM",
  "API",
];

function FieldError({
  state,
  field,
}: {
  state: CreateUserActionState;
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

export default function UserCreateForm({
  roles,
}: Props) {
  const [state, formAction, isPending] =
    useActionState(
      createUserAction,
      initialState
    );

  const [copyMessage, setCopyMessage] =
    useState("");

  async function copyTemporaryPassword() {
    if (!state.result?.temporaryPassword) {
      return;
    }

    await navigator.clipboard.writeText(
      state.result.temporaryPassword
    );

    setCopyMessage("Şifre kopyalandı");
  }

  if (state.success && state.result) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm lg:p-8">
        <div className="rounded-2xl bg-emerald-50 p-6">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
            Kayıt Tamamlandı
          </p>

          <h2 className="mt-2 text-2xl font-bold text-emerald-950">
            {state.result.fullName}
          </h2>

          <p className="mt-2 text-emerald-800">
            {state.result.employeeCode} kodlu personel ve
            kullanıcı hesabı oluşturuldu.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-500">
              Kullanıcı adı
            </p>
            <p className="mt-2 break-all font-mono text-xl font-bold text-slate-950">
              {state.result.username}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-semibold text-amber-700">
              Tek sefer gösterilen geçici şifre
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <code className="break-all rounded-lg bg-white px-3 py-2 text-xl font-bold text-amber-950">
                {state.result.temporaryPassword}
              </code>

              <button
                type="button"
                onClick={copyTemporaryPassword}
                className="rounded-lg bg-amber-700 px-4 py-2 font-bold text-white hover:bg-amber-800"
              >
                Kopyala
              </button>
            </div>

            {copyMessage && (
              <p className="mt-2 text-sm font-semibold text-emerald-700">
                {copyMessage}
              </p>
            )}

            <p className="mt-3 text-sm text-amber-800">
              Kullanıcı ilk girişte bu şifreyi değiştirmek
              zorundadır. Sayfadan ayrılmadan önce güvenli
              şekilde iletin.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/admin/users"
            className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800"
          >
            Kullanıcı Listesine Dön
          </Link>

          <Link
            href="/admin/users/new"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
          >
            Başka Kullanıcı Oluştur
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-6"
    >
      {state.message && !state.field && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800">
          {state.message}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">
          Personel Bilgileri
        </h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <label className="block">
            <span className="font-semibold text-slate-700">
              Personel kodu *
            </span>
            <input
              name="employeeCode"
              required
              maxLength={30}
              defaultValue={
                state.values?.employeeCode ?? ""
              }
              placeholder="EMP0002"
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
              defaultValue={
                state.values?.firstName ?? ""
              }
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
              defaultValue={
                state.values?.lastName ?? ""
              }
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
              defaultValue={state.values?.email ?? ""}
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
              defaultValue={state.values?.phone ?? ""}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-600"
            />
          </label>

          <label className="block">
            <span className="font-semibold text-slate-700">
              Departman
            </span>
            <input
              name="department"
              defaultValue={
                state.values?.department ?? "Depo"
              }
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-600"
            />
          </label>

          <label className="block">
            <span className="font-semibold text-slate-700">
              Ünvan
            </span>
            <input
              name="title"
              defaultValue={state.values?.title ?? ""}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-600"
            />
          </label>

          <label className="block">
            <span className="font-semibold text-slate-700">
              Vardiya kodu
            </span>
            <input
              name="shiftCode"
              defaultValue={
                state.values?.shiftCode ?? ""
              }
              placeholder="V1"
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 uppercase outline-none focus:border-blue-600"
            />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">
          Giriş ve Yetki Bilgileri
        </h2>

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
              defaultValue={
                state.values?.username ?? ""
              }
              placeholder="ad.soyad"
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
              defaultValue={
                state.values?.userType ??
                "WAREHOUSE"
              }
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4"
            >
              {USER_TYPES.map(
                (userType) => (
                  <option
                    key={userType}
                    value={userType}
                  >
                    {USER_TYPE_LABELS[userType]}
                  </option>
                )
              )}
            </select>
            <FieldError
              state={state}
              field="userType"
            />
          </label>

          <label className="block">
            <span className="font-semibold text-slate-700">
              Geçici şifre
            </span>
            <input
              name="temporaryPassword"
              type="password"
              minLength={6}
              maxLength={72}
              autoComplete="new-password"
              placeholder="Boş bırakırsanız güvenli şifre üretilir"
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-600"
            />
            <p className="mt-2 text-xs text-slate-500">
              Boş bırakılması önerilir. Sistem güvenli ve
              tek sefer gösterilen bir şifre üretir.
            </p>
            <FieldError
              state={state}
              field="temporaryPassword"
            />
          </label>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
            <input
              name="isRfUser"
              type="checkbox"
              defaultChecked={
                state.values?.isRfUser ?? true
              }
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
              defaultChecked={
                state.values?.isAdminUser ?? false
              }
              className="mt-1 h-5 w-5"
            />
            <span>
              <strong className="block text-violet-900">
                Yönetici kullanıcı
              </strong>
              <span className="mt-1 block text-sm text-violet-700">
                Bu seçenek işaretlenirse SYSTEM_ADMIN
                rolü de seçilmelidir.
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-950">
          Roller
        </h2>

        <p className="mt-1 text-slate-500">
          Kullanıcının erişebileceği yetki gruplarını seçin.
          Yönetici olmayan kullanıcıya SYSTEM_ADMIN rolü
          vermeyin. Operasyon rolleri henüz tanımlı değilse
          bu alan boş bırakılabilir.
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
                defaultChecked={
                  state.values?.roleIds.includes(
                    role.id
                  ) ?? false
                }
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
              Aktif rol bulunamadı. Önce bootstrap
              işleminin tamamlandığını kontrol edin.
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
            ? "Kullanıcı oluşturuluyor..."
            : "Kullanıcıyı Oluştur"}
        </button>
      </div>
    </form>
  );
}
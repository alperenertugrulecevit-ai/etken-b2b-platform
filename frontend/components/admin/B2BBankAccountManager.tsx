"use client";

import { useActionState } from "react";

import {
  saveB2BBankAccountAction,
  toggleB2BBankAccountAction,
  type B2BBankAccountActionState,
} from "@/app/admin/b2b-settings/actions";

type BankAccount = {
  id: number;
  bankName: string;
  branchName: string | null;
  accountHolder: string;
  iban: string;
  currency: string;
  isActive: boolean;
  sortOrder: number;
};

const initialState: B2BBankAccountActionState = {
  success: false,
  message: "",
};

function formatIban(value: string) {
  return value.replace(/(.{4})/g, "$1 ").trim();
}

function AccountForm({ account }: { account?: BankAccount }) {
  const [state, action, pending] = useActionState(
    saveB2BBankAccountAction,
    initialState
  );

  return (
    <form action={action} className="rounded-2xl border border-slate-200 bg-white p-5">
      {account ? <input type="hidden" name="id" value={account.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold">
          Banka Adı
          <input
            name="bankName"
            defaultValue={account?.bankName ?? ""}
            required
            maxLength={100}
            className="mt-2 w-full rounded-xl border border-slate-300 p-3"
          />
        </label>
        <label className="text-sm font-semibold">
          Şube
          <input
            name="branchName"
            defaultValue={account?.branchName ?? ""}
            maxLength={100}
            className="mt-2 w-full rounded-xl border border-slate-300 p-3"
          />
        </label>
        <label className="text-sm font-semibold md:col-span-2">
          Hesap Sahibi
          <input
            name="accountHolder"
            defaultValue={account?.accountHolder ?? "Etken Ofis Tedarik Hizm. Ltd. Şti."}
            required
            maxLength={160}
            className="mt-2 w-full rounded-xl border border-slate-300 p-3"
          />
        </label>
        <label className="text-sm font-semibold md:col-span-2">
          IBAN
          <input
            name="iban"
            defaultValue={account ? formatIban(account.iban) : ""}
            required
            placeholder="TR00 0000 0000 0000 0000 0000 00"
            className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-mono"
          />
        </label>
        <label className="text-sm font-semibold">
          Para Birimi
          <select
            name="currency"
            defaultValue={account?.currency ?? "TRY"}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3"
          >
            <option value="TRY">TRY</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Görüntüleme Sırası
          <input
            type="number"
            name="sortOrder"
            defaultValue={account?.sortOrder ?? 0}
            className="mt-2 w-full rounded-xl border border-slate-300 p-3"
          />
        </label>
      </div>

      {state.message ? (
        <p
          className={
            "mt-4 rounded-xl p-3 text-sm font-semibold " +
            (state.success
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700")
          }
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-xl bg-blue-900 px-5 py-3 font-bold text-white disabled:bg-slate-400"
      >
        {pending ? "Kaydediliyor..." : account ? "Hesabı Güncelle" : "Yeni Hesabı Kaydet"}
      </button>
    </form>
  );
}

export default function B2BBankAccountManager({
  accounts,
}: {
  accounts: BankAccount[];
}) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-xl font-bold">Yeni Banka Hesabı</h2>
        <AccountForm />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Tanımlı Banka Hesapları</h2>
        {accounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            Henüz banka hesabı tanımlanmadı.
          </div>
        ) : (
          <div className="space-y-5">
            {accounts.map((account) => (
              <div key={account.id} className="rounded-2xl bg-white p-5 shadow">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-black">{account.bankName}</p>
                    <p className="mt-1 font-mono text-sm">{formatIban(account.iban)}</p>
                  </div>
                  <form action={toggleB2BBankAccountAction}>
                    <input type="hidden" name="id" value={account.id} />
                    <button
                      type="submit"
                      className={
                        "rounded-full px-4 py-2 text-sm font-bold " +
                        (account.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-700")
                      }
                    >
                      {account.isActive ? "Aktif" : "Pasif"}
                    </button>
                  </form>
                </div>
                <AccountForm account={account} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

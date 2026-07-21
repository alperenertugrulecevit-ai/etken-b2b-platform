"use client";

import {
  useActionState,
  useState,
} from "react";

import {
  resetUserPasswordAction,
  type ResetUserPasswordState,
} from "@/app/admin/users/[id]/password/actions";

import { PASSWORD_POLICY } from "@/modules/auth/constants/password-policy.constants";

type UserPasswordResetFormProps = {
  userId: string;
  username: string;
};

const initialState: ResetUserPasswordState = {
  success: false,
  message: "",
};

function getRandomCharacter(
  characters: string
) {
  const randomValues =
    new Uint32Array(1);

  crypto.getRandomValues(
    randomValues
  );

  return characters[
    randomValues[0] %
      characters.length
  ];
}

function shuffleCharacters(
  characters: string[]
) {
  const shuffled = [
    ...characters,
  ];

  for (
    let index =
      shuffled.length - 1;
    index > 0;
    index--
  ) {
    const randomValues =
      new Uint32Array(1);

    crypto.getRandomValues(
      randomValues
    );

    const targetIndex =
      randomValues[0] %
      (index + 1);

    [
      shuffled[index],
      shuffled[targetIndex],
    ] = [
      shuffled[targetIndex],
      shuffled[index],
    ];
  }

  return shuffled.join("");
}

function generateStrongPassword() {
  const uppercase =
    "ABCDEFGHJKLMNPQRSTUVWXYZ";

  const lowercase =
    "abcdefghijkmnopqrstuvwxyz";

  const numbers =
    "23456789";

  const specialCharacters =
    "!@#$%&*+-=?";

  const allCharacters =
    uppercase +
    lowercase +
    numbers +
    specialCharacters;

  const passwordCharacters = [
    getRandomCharacter(
      uppercase
    ),

    getRandomCharacter(
      lowercase
    ),

    getRandomCharacter(
      numbers
    ),

    getRandomCharacter(
      specialCharacters
    ),
  ];

  while (
    passwordCharacters.length < 16
  ) {
    passwordCharacters.push(
      getRandomCharacter(
        allCharacters
      )
    );
  }

  return shuffleCharacters(
    passwordCharacters
  );
}

export default function UserPasswordResetForm({
  userId,
  username,
}: UserPasswordResetFormProps) {
  const resetAction =
    resetUserPasswordAction.bind(
      null,
      userId
    );

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    resetAction,
    initialState
  );

  const [
    temporaryPassword,
    setTemporaryPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  function handleGeneratePassword() {
    const generatedPassword =
      generateStrongPassword();

    setTemporaryPassword(
      generatedPassword
    );

    setConfirmPassword(
      generatedPassword
    );

    setShowPassword(true);
  }

  async function handleCopyPassword() {
    if (!temporaryPassword) {
      return;
    }

    await navigator.clipboard.writeText(
      temporaryPassword
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-black text-slate-900">
          Geçici Şifre Belirle
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          <strong>
            {username}
          </strong>{" "}
          kullanıcısı için yeni bir
          geçici şifre belirleyin.
          İşlemden sonra kullanıcının
          açık oturumları kapatılır.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Kullanıcı, bu geçici şifreyle
        giriş yaptıktan sonra kendi
        şifresini değiştirmek
        zorundadır.
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={
            handleGeneratePassword
          }
          disabled={isPending}
          className="rounded-xl bg-violet-100 px-4 py-3 text-sm font-bold text-violet-800 transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Güçlü Şifre Üret
        </button>

        <button
          type="button"
          onClick={
            handleCopyPassword
          }
          disabled={
            isPending ||
            !temporaryPassword
          }
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Şifreyi Kopyala
        </button>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-bold text-slate-700">
          Geçici Şifre
        </span>

        <input
          name="temporaryPassword"
          type={
            showPassword
              ? "text"
              : "password"
          }
          value={
            temporaryPassword
          }
          onChange={(event) =>
            setTemporaryPassword(
              event.target.value
            )
          }
          minLength={
            PASSWORD_POLICY.MIN_LENGTH
          }
          maxLength={
            PASSWORD_POLICY.MAX_LENGTH
          }
          autoComplete="new-password"
          disabled={isPending}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          required
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-bold text-slate-700">
          Geçici Şifre Tekrarı
        </span>

        <input
          name="confirmPassword"
          type={
            showPassword
              ? "text"
              : "password"
          }
          value={
            confirmPassword
          }
          onChange={(event) =>
            setConfirmPassword(
              event.target.value
            )
          }
          minLength={
            PASSWORD_POLICY.MIN_LENGTH
          }
          maxLength={
            PASSWORD_POLICY.MAX_LENGTH
          }
          autoComplete="new-password"
          disabled={isPending}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          required
        />
      </label>

      <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(event) =>
            setShowPassword(
              event.target.checked
            )
          }
          disabled={isPending}
        />

        Şifreyi göster
      </label>

      <p className="text-xs leading-5 text-slate-500">
        Şifre en az{" "}
        {
          PASSWORD_POLICY.MIN_LENGTH
        }{" "}
        karakter olmalı ve büyük harf,
        küçük harf, rakam ve özel
        karakter içermelidir.
      </p>

      {state.message && (
        <div
          className={`rounded-xl border p-4 text-sm font-semibold ${
            state.success
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-red-700 px-5 py-4 font-black text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? "Şifre Sıfırlanıyor..."
          : "Şifreyi Sıfırla ve Oturumları Kapat"}
      </button>
    </form>
  );
}
"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useFormStatus,
} from "react-dom";

import {
  completeInventoryCountLocationAction,
  countInventoryItemAction,
} from "@/app/rf/inventory-counts/[id]/locations/[locationId]/actions";

export type RFCountedLineSummary = {
  id: number;
  handlingUnitBarcode: string;
  productCode: string;
  productName: string;
  countedQuantity: number;
  countedByName: string;
  countedAt: string;
  isDiscovered: boolean;
};

type RFInventoryCountFormProps = {
  inventoryCountId: number;
  inventoryCountLocationId: number;
  countNumber: string;
  locationCode: string;

  countedLines:
    RFCountedLineSummary[];
};

const initialState = {
  success: false,
  message: "",
};

function CompleteButton() {
  const {
    pending,
  } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-emerald-700 px-5 py-4 text-lg font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending
        ? "Lokasyon tamamlanıyor..."
        : "Lokasyon Sayımını Tamamla"}
    </button>
  );
}

export default function RFInventoryCountForm({
  inventoryCountId,
  inventoryCountLocationId,
  countNumber,
  locationCode,
  countedLines,
}: RFInventoryCountFormProps) {
  const handlingUnitInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const productInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const quantityInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const countFormRef =
    useRef<HTMLFormElement>(
      null
    );

  const [
    handlingUnitBarcode,
    setHandlingUnitBarcode,
  ] = useState("");

  const [
    isHandlingUnitLocked,
    setIsHandlingUnitLocked,
  ] = useState(false);

  const [
    productBarcode,
    setProductBarcode,
  ] = useState("");

  const [
    countedQuantity,
    setCountedQuantity,
  ] = useState("");

  const [
    note,
    setNote,
  ] = useState("");

  const countAction =
    countInventoryItemAction.bind(
      null,
      inventoryCountId,
      inventoryCountLocationId
    );

  const completeAction =
    completeInventoryCountLocationAction.bind(
      null,
      inventoryCountId,
      inventoryCountLocationId
    );

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    countAction,
    initialState
  );

  /*
   * Başarılı kayıttan sonra THM
   * sabit kalır. Yalnızca sıradaki
   * SKU için ürün, miktar ve not
   * alanları temizlenir.
   */
  useEffect(() => {
    if (!state.success) {
      return;
    }

    setIsHandlingUnitLocked(
      true
    );

    setProductBarcode("");
    setCountedQuantity("");
    setNote("");

    window.setTimeout(
      () => {
        productInputRef.current
          ?.focus();
      },
      50
    );
  }, [state]);

  function handleHandlingUnitEnter(
    event:
      KeyboardEvent<HTMLInputElement>
  ) {
    if (
      event.key !== "Enter"
    ) {
      return;
    }

    event.preventDefault();

    const normalizedBarcode =
      handlingUnitBarcode
        .trim()
        .toUpperCase();

    if (!normalizedBarcode) {
      handlingUnitInputRef.current
        ?.focus();

      return;
    }

    setHandlingUnitBarcode(
      normalizedBarcode
    );

    setIsHandlingUnitLocked(
      true
    );

    productInputRef.current
      ?.focus();
  }

  function handleProductEnter(
    event:
      KeyboardEvent<HTMLInputElement>
  ) {
    if (
      event.key !== "Enter"
    ) {
      return;
    }

    event.preventDefault();

    if (
      !productBarcode.trim()
    ) {
      return;
    }

    quantityInputRef.current
      ?.focus();

    quantityInputRef.current
      ?.select();
  }

  function submitQuantity(
    event:
      KeyboardEvent<HTMLInputElement>
  ) {
    if (
      event.key !== "Enter"
    ) {
      return;
    }

    event.preventDefault();

    if (
      !handlingUnitBarcode.trim() ||
      !productBarcode.trim() ||
      countedQuantity === ""
    ) {
      return;
    }

    countFormRef.current
      ?.requestSubmit();
  }

  function handleCountSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    if (
      !handlingUnitBarcode.trim()
    ) {
      event.preventDefault();

      setIsHandlingUnitLocked(
        false
      );

      handlingUnitInputRef.current
        ?.focus();

      return;
    }

    if (
      !productBarcode.trim()
    ) {
      event.preventDefault();

      setIsHandlingUnitLocked(
        true
      );

      productInputRef.current
        ?.focus();

      return;
    }

    if (
      countedQuantity === ""
    ) {
      event.preventDefault();

      quantityInputRef.current
        ?.focus();

      return;
    }

    setIsHandlingUnitLocked(
      true
    );
  }

  function clearHandlingUnit() {
    if (isPending) {
      return;
    }

    setHandlingUnitBarcode("");
    setProductBarcode("");
    setCountedQuantity("");
    setNote("");

    setIsHandlingUnitLocked(
      false
    );

    window.setTimeout(
      () => {
        handlingUnitInputRef.current
          ?.focus();
      },
      50
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-blue-950 to-slate-900 p-5 text-white shadow-lg">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-300">
          Kör Sayım
        </p>

        <h1 className="mt-2 text-2xl font-black">
          {locationCode}
        </h1>

        <p className="mt-2 text-sm text-slate-300">
          Sayım No:{" "}
          <strong className="text-white">
            {countNumber}
          </strong>
        </p>

        <div className="mt-4 rounded-xl border border-blue-800 bg-blue-950/60 p-4">
          <p className="text-sm font-bold text-blue-200">
            Okutma sırası
          </p>

          <p className="mt-2 text-lg font-black">
            THM → Ürün → Miktar
          </p>

          <p className="mt-2 text-xs leading-5 text-blue-200">
            Aynı THM içindeki bütün
            SKU’lar bitene kadar THM
            sabit kalır.
          </p>
        </div>
      </section>

      {state.message && (
        <div
          role={
            state.success
              ? "status"
              : "alert"
          }
          className={`rounded-2xl border p-4 font-semibold leading-6 ${
            state.success
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {state.message}
        </div>
      )}

      <form
        ref={countFormRef}
        action={formAction}
        onSubmit={
          handleCountSubmit
        }
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <label
              htmlFor="handlingUnitBarcode"
              className="block text-sm font-black text-slate-800"
            >
              1. THM Barkodu
            </label>

            {handlingUnitBarcode && (
              <button
                type="button"
                disabled={isPending}
                onClick={
                  clearHandlingUnit
                }
                className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                THM’yi Temizle /
                Değiştir
              </button>
            )}
          </div>

          <input
            ref={
              handlingUnitInputRef
            }
            id="handlingUnitBarcode"
            name="handlingUnitBarcode"
            type="text"
            required
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            readOnly={
              isHandlingUnitLocked
            }
            disabled={isPending}
            value={
              handlingUnitBarcode
            }
            onChange={(event) =>
              setHandlingUnitBarcode(
                event.target.value.toUpperCase()
              )
            }
            onKeyDown={
              handleHandlingUnitEnter
            }
            className={`w-full rounded-xl border-2 px-4 py-4 text-xl font-black uppercase outline-none transition focus:ring-4 disabled:bg-slate-100 ${
              isHandlingUnitLocked
                ? "border-emerald-500 bg-emerald-50 text-emerald-950 focus:border-emerald-600 focus:ring-emerald-600/20"
                : "border-blue-300 bg-white text-slate-950 focus:border-blue-700 focus:ring-blue-700/20"
            }`}
            placeholder="Koli veya palet barkodunu okutun"
          />

          {isHandlingUnitLocked &&
            handlingUnitBarcode && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
              <span className="text-xl">
                ✓
              </span>

              <div>
                <p className="text-xs font-bold uppercase">
                  Aktif THM
                </p>

                <p className="font-black">
                  {
                    handlingUnitBarcode
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="productBarcode"
            className="mb-2 block text-sm font-black text-slate-800"
          >
            2. Ürün Barkodu
          </label>

          <input
            ref={
              productInputRef
            }
            id="productBarcode"
            name="productBarcode"
            type="text"
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={
              isPending ||
              !isHandlingUnitLocked
            }
            value={
              productBarcode
            }
            onChange={(event) =>
              setProductBarcode(
                event.target.value.toUpperCase()
              )
            }
            onKeyDown={
              handleProductEnter
            }
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-4 text-xl font-black uppercase text-slate-950 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-700/20 disabled:cursor-not-allowed disabled:bg-slate-100"
            placeholder={
              isHandlingUnitLocked
                ? "Ürün barkodunu okutun"
                : "Önce THM barkodunu okutun"
            }
          />
        </div>

        <div>
          <label
            htmlFor="countedQuantity"
            className="mb-2 block text-sm font-black text-slate-800"
          >
            3. Fiziksel Miktar
          </label>

          <input
            ref={
              quantityInputRef
            }
            id="countedQuantity"
            name="countedQuantity"
            type="number"
            inputMode="numeric"
            required
            min={0}
            step={1}
            disabled={
              isPending ||
              !isHandlingUnitLocked
            }
            value={
              countedQuantity
            }
            onChange={(event) =>
              setCountedQuantity(
                event.target.value
              )
            }
            onKeyDown={
              submitQuantity
            }
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-4 text-2xl font-black text-slate-950 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-700/20 disabled:cursor-not-allowed disabled:bg-slate-100"
            placeholder="Saydığınız miktarı girin"
          />
        </div>

        <div>
          <label
            htmlFor="note"
            className="mb-2 block text-sm font-black text-slate-800"
          >
            Sayım Notu
          </label>

          <textarea
            id="note"
            name="note"
            rows={3}
            maxLength={500}
            disabled={
              isPending ||
              !isHandlingUnitLocked
            }
            value={note}
            onChange={(event) =>
              setNote(
                event.target.value
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20 disabled:cursor-not-allowed disabled:bg-slate-100"
            placeholder="Varsa fark veya ürünle ilgili açıklama..."
          />
        </div>

        <button
          type="submit"
          disabled={
            isPending ||
            !isHandlingUnitLocked
          }
          className="w-full rounded-xl bg-blue-900 px-5 py-4 text-lg font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isPending
            ? "Sayım kaydediliyor..."
            : "SKU Sayımını Kaydet"}
        </button>

        {isHandlingUnitLocked && (
          <p className="text-center text-xs font-semibold leading-5 text-slate-500">
            Kayıttan sonra aynı THM
            sabit kalır ve sıradaki SKU
            barkoduna geçilir.
          </p>
        )}
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Okutulan Ürünler
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Bu lokasyonda
              kaydedilen sayım
              girişleri.
            </p>
          </div>

          <span className="rounded-full bg-blue-100 px-3 py-2 text-sm font-black text-blue-800">
            {
              countedLines.length
            }{" "}
            satır
          </span>
        </div>

        {countedLines.length ===
        0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">
            Henüz ürün okutulmadı.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {countedLines.map(
              (line) => (
                <article
                  key={
                    line.id
                  }
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-black text-slate-950">
                        {
                          line.productCode
                        }{" "}
                        -{" "}
                        {
                          line.productName
                        }
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-600">
                        THM:{" "}
                        {
                          line.handlingUnitBarcode
                        }
                      </p>
                    </div>

                    <div className="shrink-0 rounded-xl bg-blue-900 px-4 py-3 text-center text-white">
                      <p className="text-xs font-bold uppercase text-blue-200">
                        Sayılan
                      </p>

                      <p className="mt-1 text-2xl font-black">
                        {
                          line.countedQuantity
                        }
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {line.isDiscovered && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-800">
                        Fark Satırı
                      </span>
                    )}

                    <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-600">
                      {
                        line.countedByName
                      }
                    </span>

                    <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-500">
                      {
                        line.countedAt
                      }
                    </span>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-950 shadow-sm">
        <h2 className="text-xl font-black">
          Lokasyonu Tamamla
        </h2>

        <p className="mt-2 text-sm leading-6">
          Lokasyonu tamamladığınızda
          okutulmayan snapshot ürünleri
          fiziksel olarak bulunamadığı
          için sıfır sayılmış kabul
          edilir.
        </p>

        <p className="mt-2 text-sm font-black">
          Bu işlemden önce
          lokasyondaki bütün THM ve
          SKU’ları okuttuğunuzdan emin
          olun.
        </p>

        <form
          action={
            completeAction
          }
          className="mt-5"
          onSubmit={(event) => {
            const confirmed =
              window.confirm(
                `${locationCode} lokasyonunun sayımını tamamlamak istiyor musunuz? Okutulmayan ürünler sıfır kabul edilecektir.`
              );

            if (!confirmed) {
              event.preventDefault();
            }
          }}
        >
          <CompleteButton />
        </form>
      </section>
    </div>
  );
}
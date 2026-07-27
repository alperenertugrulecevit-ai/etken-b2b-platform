"use client";

import {
  useActionState,
  useEffect,
  useRef,
} from "react";

import {
  createBarcodePrinterAction,
  type BarcodePrinterActionState,
} from "@/app/admin/barcode-printers/actions";

const initialState: BarcodePrinterActionState = {
  success: false,
  message: "",
};

export default function BarcodePrinterCreateForm() {
  const formRef =
    useRef<HTMLFormElement>(null);

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    createBarcodePrinterAction,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-blue-700">
          Ağ Yazıcısı
        </p>

        <h2 className="mt-2 text-2xl font-black text-slate-950">
          Yeni Barkod Yazıcısı
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          RF terminalinden 10 × 10 cm
          çeki listesi basmak için ağ
          bağlantılı ZPL yazıcısını
          tanımlayın.
        </p>
      </div>

      {state.message && (
        <div
          role="alert"
          className={`mt-5 rounded-xl border p-4 ${
            state.success
              ? "border-green-300 bg-green-50 text-green-900"
              : "border-red-300 bg-red-50 text-red-900"
          }`}
        >
          <p className="font-black">
            {state.success
              ? "Kayıt başarılı"
              : "Kayıt gerçekleştirilemedi"}
          </p>

          <p className="mt-2 text-sm leading-6">
            {state.message}
          </p>
        </div>
      )}

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-black text-slate-800">
            Yazıcı Kodu
          </span>

          <input
            name="code"
            placeholder="Örnek: ZEBRA-01"
            maxLength={30}
            autoComplete="off"
            required
            disabled={isPending}
            className="w-full rounded-xl border border-slate-300 p-4 font-bold uppercase text-slate-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
          />

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Yazıcıyı sistemde ayırt
            etmek için benzersiz bir
            kod kullanın.
          </p>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black text-slate-800">
            Yazıcı Adı
          </span>

          <input
            name="name"
            placeholder="Örnek: Paketleme Zebra ZD230"
            maxLength={100}
            autoComplete="off"
            required
            disabled={isPending}
            className="w-full rounded-xl border border-slate-300 p-4 font-bold text-slate-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-black text-slate-800">
            Yazıcı IP Adresi
          </span>

          <input
            name="ipAddress"
            placeholder="Örnek: 192.168.1.50"
            inputMode="decimal"
            autoComplete="off"
            required
            disabled={isPending}
            className="w-full rounded-xl border border-slate-300 p-4 font-bold text-slate-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
          />

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Yazıcının sabit yerel ağ IP
            adresini girin. İnternet
            üzerindeki adreslere baskı
            gönderilemez.
          </p>
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-800">
              RAW Baskı Portu
            </span>

            <input
              name="port"
              type="number"
              value={9100}
              readOnly
              required
              className="w-full cursor-not-allowed rounded-xl border border-slate-300 bg-slate-100 p-4 font-black text-slate-700"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-800">
              Çözünürlük
            </span>

            <select
              name="dpi"
              defaultValue="203"
              required
              disabled={isPending}
              className="w-full rounded-xl border border-slate-300 bg-white p-4 font-bold text-slate-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="203">
                203 DPI
              </option>

              <option value="300">
                300 DPI
              </option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
          <div>
            <p className="text-xs font-bold uppercase text-cyan-700">
              Etiket Ölçüsü
            </p>

            <p className="mt-1 font-black text-slate-950">
              100 × 100 mm
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-cyan-700">
              Yazıcı Dili
            </p>

            <p className="mt-1 font-black text-slate-950">
              ZPL
            </p>
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-black text-slate-800">
            Açıklama
          </span>

          <textarea
            name="description"
            rows={3}
            maxLength={500}
            placeholder="Örnek: Paketleme masası 1 yanında bulunan yazıcı"
            disabled={isPending}
            className="w-full resize-none rounded-xl border border-slate-300 p-4 text-slate-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={`mt-6 w-full rounded-xl py-4 font-black text-white ${
          isPending
            ? "cursor-not-allowed bg-slate-400"
            : "bg-blue-900 hover:bg-blue-800"
        }`}
      >
        {isPending
          ? "Yazıcı Kaydediliyor..."
          : "Barkod Yazıcısını Kaydet"}
      </button>
    </form>
  );
}
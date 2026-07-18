import Link from "next/link";
import {
  WavePriority,
  WaveType,
} from "@prisma/client";
import { createWaveAction } from "../actions";

const waveTypeOptions = [
  {
    value: WaveType.STORE_REPLENISHMENT,
    label: "Mağaza İkmal",
  },
  {
    value: WaveType.CUSTOMER_ORDER,
    label: "Müşteri Siparişi",
  },
  {
    value: WaveType.ECOMMERCE,
    label: "E-Ticaret",
  },
  {
    value: WaveType.TRANSFER,
    label: "Depolararası Transfer",
  },
  {
    value: WaveType.MIXED,
    label: "Karma Wave",
  },
];

const wavePriorityOptions = [
  {
    value: WavePriority.LOW,
    label: "Düşük",
  },
  {
    value: WavePriority.NORMAL,
    label: "Normal",
  },
  {
    value: WavePriority.HIGH,
    label: "Yüksek",
  },
  {
    value: WavePriority.CRITICAL,
    label: "Kritik",
  },
];

export default function NewWavePage() {
  return (
    <section className="p-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-700">
              Wave Management
            </p>

            <h1 className="mt-2 text-4xl font-bold text-slate-900">
              Yeni Wave Oluştur
            </h1>

            <p className="mt-3 max-w-2xl text-slate-500">
              Toplama, paketleme ve sevkiyat
              operasyonlarını yönetmek için yeni bir
              operasyon dalgası oluşturun.
            </p>
          </div>

          <Link
            href="/admin/waves"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ← Wave Listesine Dön
          </Link>
        </div>

        <form
          action={createWaveAction}
          className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow"
        >
          <div className="border-b border-slate-200 bg-slate-50 px-7 py-5">
            <h2 className="text-xl font-bold text-slate-900">
              Wave Bilgileri
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Wave numarası sistem tarafından otomatik
              oluşturulacaktır.
            </p>
          </div>

          <div className="grid gap-6 p-7 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Wave Adı
              </label>

              <input
                id="name"
                name="name"
                type="text"
                placeholder="Örnek: Avrupa Yakası Sabah Sevkiyatı"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="type"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Wave Tipi
              </label>

              <select
                id="type"
                name="type"
                defaultValue={WaveType.MIXED}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
              >
                {waveTypeOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="priority"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Öncelik
              </label>

              <select
                id="priority"
                name="priority"
                defaultValue={WavePriority.NORMAL}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
              >
                {wavePriorityOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="plannedStartAt"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Planlanan Başlangıç
              </label>

              <input
                id="plannedStartAt"
                name="plannedStartAt"
                type="datetime-local"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="plannedFinishAt"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Planlanan Bitiş
              </label>

              <input
                id="plannedFinishAt"
                name="plannedFinishAt"
                type="datetime-local"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="createdBy"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Oluşturan Kullanıcı
              </label>

              <input
                id="createdBy"
                name="createdBy"
                type="text"
                placeholder="Örnek: Yasin Ecevit"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="notes"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Operasyon Notu
              </label>

              <textarea
                id="notes"
                name="notes"
                rows={5}
                placeholder="Wave ile ilgili operasyon notlarını yazabilirsiniz."
                className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-slate-50 px-7 py-5">
            <Link
              href="/admin/waves"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              İptal
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-blue-900 px-6 py-3 font-bold text-white transition hover:bg-blue-800"
            >
              Wave Oluştur
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
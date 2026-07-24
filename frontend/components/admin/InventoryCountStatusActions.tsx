"use client";

import {
  useFormStatus,
} from "react-dom";

import {
  activateInventoryCountAction,
  cancelInventoryCountAction,
} from "@/app/admin/inventory-counts/[id]/actions";

type InventoryCountStatusValue =
  | "DRAFT"
  | "ACTIVE"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "APPROVED"
  | "CANCELLED";

type InventoryCountStatusActionsProps = {
  inventoryCountId: number;
  countNumber: string;
  status:
    InventoryCountStatusValue;
  canManage: boolean;
};

function ActivateButton() {
  const {
    pending,
  } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-blue-900 px-5 py-3 font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending
        ? "Sayım aktifleştiriliyor..."
        : "Sayımı Aktifleştir"}
    </button>
  );
}

function CancelButton() {
  const {
    pending,
  } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-red-700 px-5 py-3 font-black text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {pending
        ? "Sayım iptal ediliyor..."
        : "Sayımı İptal Et"}
    </button>
  );
}

export default function InventoryCountStatusActions({
  inventoryCountId,
  countNumber,
  status,
  canManage,
}: InventoryCountStatusActionsProps) {
  const activateAction =
    activateInventoryCountAction.bind(
      null,
      inventoryCountId
    );

  const cancelAction =
    cancelInventoryCountAction.bind(
      null,
      inventoryCountId
    );

  if (
    status === "APPROVED"
  ) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
        <h2 className="font-black">
          Sayım onaylandı
        </h2>

        <p className="mt-2 text-sm leading-6">
          Onaylanmış sayım
          değiştirilemez veya iptal
          edilemez. Bu kayıt yalnızca
          raporlama amacıyla
          görüntülenebilir.
        </p>
      </section>
    );
  }

  if (
    status === "CANCELLED"
  ) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
        <h2 className="font-black">
          Sayım iptal edildi
        </h2>

        <p className="mt-2 text-sm leading-6">
          İptal edilmiş sayım yeniden
          aktifleştirilemez ve stoklara
          uygulanamaz.
        </p>
      </section>
    );
  }

  if (!canManage) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-slate-100 p-5 text-slate-700">
        <h2 className="font-black">
          İşlem yetkisi bulunmuyor
        </h2>

        <p className="mt-2 text-sm leading-6">
          Sayımı aktifleştirmek veya
          iptal etmek için planlı sayım
          yönetme yetkisi gereklidir.
        </p>
      </section>
    );
  }

  const canCancel =
    status === "DRAFT" ||
    status === "ACTIVE" ||
    status === "IN_PROGRESS" ||
    status === "SUBMITTED";

  return (
    <div className="space-y-5">
      {status === "DRAFT" && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <h2 className="text-lg font-black text-blue-950">
            Sayımı Aktifleştir
          </h2>

          <p className="mt-2 text-sm leading-6 text-blue-900">
            Aktifleştirme sırasında
            lokasyon, THM ve ürün
            stoklarının anlık görüntüsü
            alınır. Sayım daha sonra
            atanmış personellerin RF
            terminalinde görünür.
          </p>

          <form
            action={
              activateAction
            }
            className="mt-4"
            onSubmit={(
              event
            ) => {
              const confirmed =
                window.confirm(
                  `${countNumber} numaralı sayımı aktifleştirmek istiyor musunuz? Lokasyon ve stok görüntüsü oluşturulacaktır.`
                );

              if (!confirmed) {
                event.preventDefault();
              }
            }}
          >
            <ActivateButton />
          </form>
        </section>
      )}

      {canCancel && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <h2 className="text-lg font-black text-red-950">
            Sayımı İptal Et
          </h2>

          <p className="mt-2 text-sm leading-6 text-red-900">
            Sayım onaylanmadan önce
            iptal edilebilir. İptal
            işlemi stokları değiştirmez
            ve geri alınamaz.
          </p>

          <form
            action={
              cancelAction
            }
            className="mt-4 space-y-4"
            onSubmit={(
              event
            ) => {
              const confirmed =
                window.confirm(
                  `${countNumber} numaralı sayımı iptal etmek istediğinizden emin misiniz?`
                );

              if (!confirmed) {
                event.preventDefault();
              }
            }}
          >
            <div>
              <label
                htmlFor="cancelReason"
                className="mb-2 block text-sm font-bold text-red-950"
              >
                İptal Gerekçesi
              </label>

              <textarea
                id="cancelReason"
                name="cancelReason"
                required
                minLength={5}
                maxLength={500}
                rows={4}
                className="w-full rounded-xl border border-red-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-700/20"
                placeholder="Sayımın neden iptal edildiğini açıklayın..."
              />

              <p className="mt-2 text-xs font-semibold text-red-700">
                En az 5, en fazla 500
                karakter.
              </p>
            </div>

            <CancelButton />
          </form>
        </section>
      )}
    </div>
  );
}
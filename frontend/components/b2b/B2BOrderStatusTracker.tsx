import type { OrderStatus } from "@prisma/client";

type HistoryItem = {
  id: number;
  status: OrderStatus;
  note: string | null;
  createdAt: Date;
};

const LABELS: Record<OrderStatus, string> = {
  DRAFT: "Taslak",
  PENDING: "Onay Bekliyor",
  APPROVED: "Onaylandı",
  PREPARING: "Hazırlanıyor",
  PICKING: "Toplanıyor",
  PACKING: "Paketleniyor",
  READY_TO_SHIP: "Sevke Hazır",
  SHIPPED: "Sevk Edildi",
  DELIVERED: "Teslim Edildi",
  CANCELLED: "İptal Edildi",
};

const STEPS: OrderStatus[] = [
  "PENDING",
  "APPROVED",
  "PREPARING",
  "PICKING",
  "PACKING",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
];

export default function B2BOrderStatusTracker({
  currentStatus,
  history,
}: {
  currentStatus: OrderStatus;
  history: HistoryItem[];
}) {
  if (currentStatus === "CANCELLED") {
    return (
      <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-xl font-black text-red-800">Sipariş İptal Edildi</h2>
        <p className="mt-2 text-sm text-red-700">
          Ayrıntılı bilgi için ETKEN Ofis müşteri hizmetleriyle iletişime geçebilirsiniz.
        </p>
      </section>
    );
  }

  const currentIndex = Math.max(
    0,
    STEPS.indexOf(currentStatus === "DRAFT" ? "PENDING" : currentStatus)
  );

  return (
    <section className="mt-6 rounded-2xl bg-white p-6 shadow">
      <h2 className="text-xl font-bold">Sipariş Takibi</h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((status, index) => {
          const completed = index <= currentIndex;
          return (
            <div
              key={status}
              className={
                "rounded-xl border p-4 " +
                (completed
                  ? "border-blue-800 bg-blue-900 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-500")
              }
            >
              <span className="text-xs font-bold">AŞAMA {index + 1}</span>
              <p className="mt-1 font-bold">{LABELS[status]}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-7 border-t border-slate-200 pt-6">
        <h3 className="font-bold">Durum Geçmişi</h3>
        <div className="mt-4 space-y-4">
          {history.map((item) => (
            <article key={item.id} className="border-l-4 border-blue-800 pl-4">
              <div className="flex flex-wrap justify-between gap-2">
                <strong>{LABELS[item.status]}</strong>
                <time className="text-sm text-slate-500">
                  {item.createdAt.toLocaleString("tr-TR", {
                    timeZone: "Europe/Istanbul",
                  })}
                </time>
              </div>
              {item.note ? (
                <p className="mt-1 text-sm text-slate-600">{item.note}</p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

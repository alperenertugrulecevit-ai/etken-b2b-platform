"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Row = {
  id: number;
  code: string;
  barcode: string;
  name: string;
  ordered: number;
  packed: number;
  imageUrl: string | null;
};

type OrderInfo = {
  orderNumber: string;
  placedBy: string;
  recipientName: string;
  recipientAddress: string;
  phone: string;
  totalQuantity: number;
  carrier: string;
  gift: boolean;
  giftNote: string;
};

type ScanResponse = {
  success: boolean;
  message?: string;
  mode?: "THM" | "FIFO_SINGLE";
  shippingHandlingUnitBarcode?: string | null;
  order?: OrderInfo & {
    items: Array<{
      id: number;
      code: string;
      barcode: string;
      name: string;
      ordered: number;
      imageUrl: string | null;
    }>;
  };
};

function BarcodeIcon() {
  return <span aria-hidden="true" className="font-black tracking-[-2px]">|||||</span>;
}

export default function EcommercePackagingScreen() {
  const scannerRef = useRef<HTMLInputElement>(null);
  const [scan, setScan] = useState("");
  const [message, setMessage] = useState("THM veya ürün barkodu okutun.");
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [shippingThm, setShippingThm] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    scannerRef.current?.focus();
  }, []);

  async function submitScan(event: FormEvent) {
    event.preventDefault();
    const value = scan.trim().toUpperCase();
    if (!value || busy) return;

    setScan("");

    if (order) {
      const index = rows.findIndex((row) => row.barcode.toUpperCase() === value);
      if (index < 0) {
        setMessage(`HATA: ${value} bu siparişe ait değil.`);
        requestAnimationFrame(() => scannerRef.current?.focus());
        return;
      }

      const row = rows[index];
      if (row.packed >= row.ordered) {
        setMessage(`HATA: ${row.code} için sipariş miktarı aşılamaz.`);
        requestAnimationFrame(() => scannerRef.current?.focus());
        return;
      }

      setRows((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index ? { ...item, packed: item.packed + 1 } : item,
        ),
      );
      setCurrentImage(row.imageUrl);
      setMessage(`${row.code} okundu. Paketleme miktarı güncellendi.`);
      requestAnimationFrame(() => scannerRef.current?.focus());
      return;
    }

    setBusy(true);
    setMessage(`${value} aranıyor...`);

    try {
      const response = await fetch("/api/admin/ecommerce/packaging/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: value }),
      });
      const data = (await response.json()) as ScanResponse;

      if (!response.ok || !data.success || !data.order) {
        setMessage(`HATA: ${data.message ?? "Sipariş bulunamadı."}`);
        return;
      }

      setOrder(data.order);
      setShippingThm(data.shippingHandlingUnitBarcode ?? null);
      const isSingleFifo = data.mode === "FIFO_SINGLE";
      setRows(
        data.order.items.map((item) => ({
          ...item,
          packed: isSingleFifo ? 1 : 0,
        })),
      );
      if (isSingleFifo) setCurrentImage(data.order.items[0]?.imageUrl ?? null);
      setMessage(
        isSingleFifo
          ? `${data.order.orderNumber} FIFO ile bulundu; tek ürün paketleme doğrulaması tamamlandı.`
          : `${data.order.orderNumber} siparişi yüklendi. Ürünleri okutun.`,
      );
    } catch {
      setMessage("HATA: Paketleme servisine ulaşılamadı.");
    } finally {
      setBusy(false);
      requestAnimationFrame(() => scannerRef.current?.focus());
    }
  }

  const total = rows.reduce((sum, row) => sum + row.ordered, 0);
  const packed = rows.reduce((sum, row) => sum + row.packed, 0);
  const progress = total ? Math.round((packed / total) * 100) : 0;

  return (
    <div className="min-w-[1100px] p-5 xl:p-7">
      <div className="mb-5 flex items-start justify-between gap-6">
        <div>
          <p className="mb-1 text-sm font-semibold text-slate-500">E-Ticaret Yönetimi / E-Ticaret Paketleme</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">E-Ticaret Paketleme</h1>
          <p className="mt-1 text-sm text-slate-500">THM veya ürün barkodu okutarak siparişi bulun ve paketleme işlemini tamamlayın.</p>
        </div>
        <div className="max-w-md rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
          ⓘ Sadece barkod okuyucu kullanın. Fare kullanımı yalnızca “Paketle ve İrsaliye Yazdır” butonu için gereklidir.
        </div>
      </div>

      <div className="grid grid-cols-[1.05fr_1.1fr_.8fr] gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-lg font-black text-slate-900">▣ Sipariş Bilgileri</h2>
            <span className="rounded-lg bg-red-50 px-3 py-1 text-xs font-bold text-red-600">E-Ticaret Siparişi</span>
          </div>
          <dl className="space-y-0 text-sm">
            {[
              ["Sipariş No", order?.orderNumber ?? "—"], ["Siparişi Veren", order?.placedBy ?? "—"], ["Alıcı İsmi", order?.recipientName ?? "—"], ["Alıcı Adresi", order?.recipientAddress ?? "—"],
              ["Telefon No", order?.phone ?? "—"], ["Sipariş Miktarı", order ? String(order.totalQuantity) : "—"], ["Nakliyeci", order?.carrier ?? "—"], ["Hediye", order ? (order.gift ? "Evet" : "Hayır") : "—"], ["Hediye Notu", order?.giftNote || "—"],
            ].map(([label,value]) => (
              <div key={label} className="grid grid-cols-[130px_1fr] border-b border-slate-100 py-2 last:border-0">
                <dt className="font-medium text-slate-500">{label}:</dt><dd className="font-semibold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 border-b border-slate-200 pb-3 text-lg font-black text-slate-900"><BarcodeIcon /> &nbsp; Barkod İşlemleri</h2>
          <form onSubmit={submitScan}>
            <label className="mb-2 block text-sm font-bold text-slate-700">THM / Ürün Okut:</label>
            <div className="flex h-14 items-center rounded-xl border-2 border-blue-500 bg-white px-4 shadow-[0_0_0_3px_rgba(59,130,246,.08)]">
              <input ref={scannerRef} value={scan} onChange={(e)=>setScan(e.target.value)} autoComplete="off" className="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none placeholder:text-slate-400" placeholder="Barkod okutun..." aria-label="THM veya ürün barkodu" />
              <BarcodeIcon />
            </div>
            <button type="submit" className="sr-only">Barkodu işle</button>
          </form>
          <p className="mt-2 min-h-5 text-xs font-semibold text-blue-700">{message}</p>

          <div className="my-5 flex items-center gap-3 text-xs font-bold text-slate-400"><span className="h-px flex-1 bg-slate-200"/><span>OTOMATİK ALGILAMA</span><span className="h-px flex-1 bg-slate-200"/></div>

          <label className="mb-2 block text-sm font-bold text-slate-700">Koli Tipi:</label>
          <div className="flex h-12 items-center justify-between rounded-xl border border-slate-300 px-4 font-semibold text-slate-700">
            <span>📦 Standart Koli (STK)</span><span>⌄</span>
          </div>
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
            ⓘ Desi barkodu okutulacak. Paketleme tamamlanınca yazdırma işlemi başlatılabilir.
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 border-b border-slate-200 pb-3 text-lg font-black text-slate-900">▣ Ürün Görseli</h2>
          <div className="flex h-[270px] flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-slate-400">
            {currentImage ? <img src={currentImage} alt="Okutulan ürün" className="h-full w-full object-contain p-3" /> : <>
              <div className="mb-3 text-5xl">📦</div>
              <p className="font-bold">Ürün okutulduğunda</p>
              <p className="text-sm">görsel burada gösterilecek</p>
            </>}
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-black text-slate-900"><BarcodeIcon /> &nbsp; Sipariş Ürünleri</h2>
        <table className="w-full overflow-hidden rounded-xl text-sm">
          <thead className="bg-slate-100 text-slate-700"><tr>{["#","Ürün Kodu","Ürün Tanımı","Sipariş Miktarı","Paketleme Miktarı","Kalan Miktar","Durum"].map(x=><th key={x} className="border border-slate-200 px-4 py-3 text-left font-black">{x}</th>)}</tr></thead>
          <tbody>
            {rows.length ? rows.map((row,index)=><tr key={row.code}><td className="border border-slate-200 px-4 py-3">{index+1}</td><td className="border border-slate-200 px-4 py-3">{row.code}</td><td className="border border-slate-200 px-4 py-3">{row.name}</td><td className="border border-slate-200 px-4 py-3">{row.ordered}</td><td className="border border-slate-200 px-4 py-3">{row.packed}</td><td className="border border-slate-200 px-4 py-3">{row.ordered-row.packed}</td><td className="border border-slate-200 px-4 py-3 font-bold text-blue-700">{row.packed >= row.ordered ? "Tamamlandı" : "Bekliyor"}</td></tr>) : (
              <tr><td colSpan={7} className="border border-slate-200 px-4 py-10 text-center font-semibold text-slate-400">Sipariş bulununca ürünler burada listelenecek.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-black">🚚 Sevk THM Bilgisi</h2>
          <div className="flex items-center justify-between"><span className="text-slate-500">Sevk THM:</span><span className="rounded-lg bg-blue-50 px-3 py-2 font-black text-blue-700">{shippingThm ?? (order ? "Tekli sipariş - otomatik THM oluşturulacak" : "—")}</span></div>
          <p className="mt-3 text-xs font-semibold text-amber-700">Tek kalem / tek adet siparişte benzersiz Sevk THM otomatik üretilecek.</p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-black">◈ Paketleme Durumu</h2>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-emerald-500 transition-all" style={{width:`${progress}%`}}/></div>
          <div className="mt-3 flex justify-between text-sm font-bold"><span>{packed} / {total} ürün tamamlandı</span><span>%{progress}</span></div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-black">🖨️ Yazdırılacak Belgeler</h2>
          <div className="space-y-2 text-sm font-semibold"><p>☑ Çeki Listesi <span className="text-slate-500">(Barkod Printer)</span></p><p>☑ İrsaliye <span className="text-slate-500">(A4 - Laser Yazıcı)</span></p><p>☑ Hediye Notu <span className="text-slate-500">(varsa, A4 - Laser Yazıcı)</span></p></div>
        </section>
      </div>

      <div className="mt-4 flex items-end justify-between gap-6">
        <div className="text-xs leading-6 text-slate-500">
          <p>* Çeki listesinde Sipariş No ve Sevk THM barkodları yazdırılır.</p>
          <p>* Tekli siparişlerde ürün barkodu ile FIFO sırasına göre en eski uygun sipariş bulunur.</p>
        </div>
        <button type="button" disabled={!order || total === 0 || packed !== total} className="rounded-xl bg-emerald-600 px-8 py-4 text-lg font-black text-white shadow-lg disabled:cursor-not-allowed disabled:bg-slate-400">🖨️ Paketle ve İrsaliye Yazdır</button>
      </div>
    </div>
  );
}

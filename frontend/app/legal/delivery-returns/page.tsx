import type {
  Metadata,
} from "next";

import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Teslimat ve İade",
};

export default function DeliveryReturnsPage() {
  return (
    <LegalPage
      eyebrow="Yasal"
      title="Teslimat ve İade"
      description="Kurumsal siparişlerin teslimat, eksik veya hasarlı ürün bildirimi ve iade süreçlerine ilişkin taslak ilkeler."
    >
      <section>
        <h2 className="text-xl font-bold text-slate-900">
          Teslimat
        </h2>

        <p className="mt-3">
          Siparişler müşteri hesabında seçilen teslimat adresine,
          sipariş onayında bildirilen plan doğrultusunda gönderilir.
          Kesin teslim süresi, sevkiyat bölgesi, ürünlerin stok durumu
          ve sipariş hacmine göre sipariş bazında teyit edilir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          Teslimat kontrolü
        </h2>

        <p className="mt-3">
          Teslim alan yetkili; koli ve ürünleri mümkün olduğu ölçüde
          teslim sırasında kontrol etmeli, görünür hasar veya adet
          farkını teslim belgesine işletmeli ve sipariş numarasıyla
          birlikte bildirmelidir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          İade ve değişim
        </h2>

        <p className="mt-3">
          İade veya değişim talebi; ürünün durumu, ambalajı, kullanım
          niteliği, tedarik koşulları ve taraflar arasındaki ticari
          sözleşme dikkate alınarak değerlendirilir. Onay alınmadan
          gönderilen ürünlerin kabulü garanti edilmez.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          Süre ve masraflar
        </h2>

        <p className="mt-3">
          Bildirim süresi, taşıma masrafı, kabul edilmeyen ürün
          grupları ve iade adresi henüz belirlenmemiştir. Bu bilgiler
          ticari politika kesinleştiğinde burada açıkça yayınlanacak;
          o tarihe kadar her talep sipariş ve sözleşme koşullarına
          göre yazılı olarak teyit edilecektir.
        </p>
      </section>
    </LegalPage>
  );
}

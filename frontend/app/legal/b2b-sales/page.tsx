import type {
  Metadata,
} from "next";

import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "B2B Satış Koşulları",
};

export default function B2BSalesPage() {
  return (
    <LegalPage
      eyebrow="Yasal"
      title="B2B Satış Koşulları"
      description="Kurumsal kullanıcılar tarafından verilen ticari siparişlere uygulanacak temel taslak koşullardır."
    >
      <section>
        <h2 className="text-xl font-bold text-slate-900">
          1. Kapsam
        </h2>

        <p className="mt-3">
          Platform işletmelerin ticari ve mesleki ihtiyaçları için
          hazırlanmıştır. Kurumsal hesap üzerinden işlem yapan kişi,
          bağlı olduğu müşteri şirket adına sipariş vermeye yetkili
          olduğunu kabul eder. Tüketici işlemleri için ayrı koşullar
          gerekiyorsa faaliyete geçmeden önce ayrıca düzenlenmelidir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          2. Ürün, fiyat ve vergi
        </h2>

        <p className="mt-3">
          Ürün bilgileri, birim fiyat, müşteri iskontosu, KDV ve
          toplam tutar sipariş ekranında gösterilir. Sepette görülen
          bilgiler sipariş oluşturulurken sunucu tarafında yeniden
          hesaplanır. Açık sistem veya veri hataları düzeltilerek
          müşteriyle iletişime geçilebilir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          3. Siparişin oluşması
        </h2>

        <p className="mt-3">
          Siparişin sisteme kaydedilmesi, sipariş talebinin alındığını
          gösterir. Stok, ödeme, teslimat adresi ve ticari koşullar
          doğrulandıktan sonra sipariş onaylanır. Karşılanamayan veya
          kısmen karşılanabilen talepler için müşteri bilgilendirilir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          4. Ödeme
        </h2>

        <p className="mt-3">
          Kullanılabilir ödeme yöntemleri sipariş sırasında gösterilir.
          Havale/EFT siparişleri ödeme doğrulamasına, cari hesap
          siparişleri ise müşteriye tanımlanan ticari limit ve vade
          koşullarına tabi olabilir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          5. Kayıtlar ve uyuşmazlık
        </h2>

        <p className="mt-3">
          Sipariş, kullanıcı, durum ve işlem kayıtları güvenlik ve
          ispat amacıyla mevzuata uygun süre boyunca saklanabilir.
          Yetkili mahkeme, uygulanacak hukuk ve ayrıntılı ticari
          hükümler resmî şirket bilgileriyle birlikte nihai sözleşmede
          belirlenecektir.
        </p>
      </section>
    </LegalPage>
  );
}

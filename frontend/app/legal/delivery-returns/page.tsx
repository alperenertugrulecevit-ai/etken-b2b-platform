import type { Metadata } from "next";

import LegalPage from "@/components/legal/LegalPage";
import { B2B_LEGAL_POLICY } from "@/modules/b2b/constants/legal.constants";
import {
  formatPublicCompanyAddress,
  getPublicCompanyProfile,
} from "@/modules/b2b/services/company-profile.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Teslimat ve İade Politikası",
  description:
    "Etken Ofis kurumsal siparişleri için teslimat, hasar bildirimi ve iade koşulları.",
};

export default async function DeliveryReturnsPage() {
  const profile = await getPublicCompanyProfile();
  const returnAddress = formatPublicCompanyAddress(profile);
  const contactEmail = profile.supportEmail || profile.email;

  return (
    <LegalPage
      eyebrow="Yasal"
      title="Teslimat ve İade Politikası"
      description="Kurumsal siparişlerin teslimatı, kontrolü, ayıp bildirimi, iptali ve ticari iadesinde uygulanacak kurallardır."
      profileComplete={profile.isComplete}
      effectiveDate={B2B_LEGAL_POLICY.effectiveDate}
      version={B2B_LEGAL_POLICY.version}
    >
      <section>
        <h2 className="text-xl font-bold text-slate-900">
          1. Teslimat bölgesi ve süre
        </h2>

        <p className="mt-3">
          Standart teslimat bölgesi: {B2B_LEGAL_POLICY.deliveryRegion}.
          Stoklu ürünlerde, siparişin, ödemenin veya cari hesap uygunluğunun
          onaylanmasından sonraki hedef teslim süresi:
          {" "}{B2B_LEGAL_POLICY.standardDeliveryTime}. Teslimatlar
          genel olarak {B2B_LEGAL_POLICY.workingHours} arasında planlanır.
        </p>

        <p className="mt-3">
          Hedef süre; ürünün tedarik şekli, sipariş hacmi, stok durumu,
          teslimat adresi, trafik, hava koşulları ve mücbir sebepler nedeniyle
          değişebilir. Özel teslimat tarihi veya saat aralığı ancak sipariş
          bazında yazılı olarak teyit edildiğinde bağlayıcıdır.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          2. Teslimat adresi ve teslim alan kişi
        </h2>

        <p className="mt-3">
          Teslimat, kurumsal hesapta seçilen ve kullanıcının erişimine açık
          teslimat adresine yapılır. Müşteri; adres, kat, bina girişi,
          teslimat kısıtı, irtibat kişisi ve telefon bilgilerinin doğru ve
          güncel olmasını sağlamakla sorumludur. Adreste bulunan çalışan,
          güvenlik veya müşteri tarafından teslim almaya yetkilendirilmiş
          kişi tarafından yapılan teslim alma geçerli kabul edilir.
        </p>

        <p className="mt-3">
          Yanlış veya eksik adres, teslimat engeli ya da müşterinin teslim
          almaması nedeniyle oluşan ek sevkiyat ve bekleme maliyetleri,
          önceden bildirilerek müşteriye yansıtılabilir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          3. Teslimat kontrolü ve ayıp bildirimi
        </h2>

        <p className="mt-3">
          Teslim alan kişi; koli sayısını, ambalajı ve mümkün olduğu ölçüde
          ürünleri teslim sırasında kontrol etmelidir. Görünür hasar, ıslaklık,
          ezilme, eksik koli veya adet farkı teslim belgesine açıklanmalı;
          mümkünse fotoğrafla kayıt altına alınmalı ve ürün teslim alınırken
          taşıyıcıya tutanak düzenletilmelidir.
        </p>

        <p className="mt-3">
          Türk Ticaret Kanunu’nun tacirler arasındaki satışlara ilişkin
          hükümleri uyarınca açıkça belli olan ayıplar teslimden itibaren
          {" "}{B2B_LEGAL_POLICY.apparentDefectNoticeDays} gün içinde
          bildirilmelidir. Açıkça belli olmayan ayıplar bakımından ürün
          teslimden itibaren {B2B_LEGAL_POLICY.inspectionDays} gün içinde
          incelenmeli veya incelettirilmeli ve ayıp bu süre içinde
          bildirilmelidir. Olağan incelemeyle belirlenemeyen gizli ayıplar,
          ortaya çıkar çıkmaz gecikmeden bildirilmelidir.
        </p>

        <p className="mt-3">
          Bildirimde sipariş numarası, ürün kodu, miktar, ayıbın açıklaması,
          teslim belgesi ve mevcutsa fotoğraflar yer almalıdır. Emredici
          mevzuattan doğan haklar saklıdır.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          4. Gönüllü ticari iade hakkı
        </h2>

        <p className="mt-3">
          Ayıplı olmayan standart stok ürünleri; teslimden itibaren
          {" "}{B2B_LEGAL_POLICY.voluntaryReturnDays} takvim günü içinde
          yazılı ön onay alınması şartıyla iade talebine konu edilebilir.
          Ürünün kullanılmamış, eksiksiz, yeniden satılabilir durumda ve
          özgün ambalajı ile aksesuarlarının bozulmamış olması gerekir.
          Bu hak kanuni cayma hakkı değil, kurumsal müşterilere sunulan
          gönüllü ticari iade imkânıdır.
        </p>

        <p className="mt-3">
          Onay alınmadan, farklı adrese veya karşı ödemeli gönderilen ürünler
          teslim alınmayabilir. İade onayı verilmesi, ürün incelenmeden
          kesin kabul edildiği anlamına gelmez.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          5. Gönüllü iadeye kabul edilmeyen ürünler
        </h2>

        <ul className="mt-3 list-disc space-y-2 pl-6">
          <li>Açılmış veya kullanılmış hijyen ve kişisel kullanım ürünleri,</li>
          <li>
            Ambalajı ya da koruyucu mührü açılmış gıda ve sarf ürünleri,
          </li>
          <li>
            Müşteriye özel üretilen, baskı yapılan, ölçülendirilen veya
            özelleştirilen ürünler,
          </li>
          <li>
            Müşteri talebi üzerine özel olarak tedarik edilen standart dışı
            ürünler,
          </li>
          <li>
            Eksik parça, aksesuar veya ambalajla gönderilen; hasar görmüş ya
            da yeniden satılabilir niteliğini kaybetmiş ürünler.
          </li>
        </ul>

        <p className="mt-3">
          Bu sınırlamalar yanlış, eksik veya ayıplı teslim edilen ürünlere
          ilişkin kanuni hakları ortadan kaldırmaz.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          6. İade süreci, taşıma masrafı ve finansal kayıt
        </h2>

        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>
            Talep, sipariş numarası ve gerekçesiyle
            {contactEmail ? ` ${contactEmail}` : " şirket iletişim kanalları"}
            üzerinden iletilir.
          </li>
          <li>
            Satıcı, inceleme sonucuna göre iade onayı ve gönderim talimatını
            yazılı olarak bildirir.
          </li>
          <li>
            Ürün, faturası veya gerekli muhasebe belgesiyle ve güvenli
            ambalajla onaylanan adrese gönderilir.
          </li>
          <li>
            Fiziksel kontrol sonrasında kabul edilen tutar; ödeme yöntemine
            göre iade edilir, cari hesaba alacak kaydedilir veya ilgili
            muhasebe belgesiyle mahsuplaştırılır.
          </li>
        </ol>

        <p className="mt-3">
          Yanlış, eksik veya ayıplı teslimatta makul iade taşıma masrafı
          satıcıya aittir. Müşterinin tercih değişikliğine dayanan gönüllü
          iadelerde taşıma ve varsa yeniden sevkiyat masrafı müşteriye
          aittir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          7. Sipariş iptali
        </h2>

        <p className="mt-3">
          Sipariş hazırlama aşamasına geçmeden önce yazılı iptal talebi
          iletilebilir. Hazırlanmaya başlanmış, müşteriye özel tedarik
          edilmiş veya sevk edilmiş siparişlerin iptali; oluşan maliyetler,
          ürünün yeniden satılabilirliği ve bu politikadaki iade kuralları
          dikkate alınarak değerlendirilir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          8. İade adresi ve iletişim
        </h2>

        <p className="mt-3">
          Onaylı iadeler için adres: {returnAddress || "şirket adresi"}.
          İade göndermeden önce sevkiyat yöntemi ve teslim alacak birim
          mutlaka yazılı olarak teyit edilmelidir.
        </p>

        <p className="mt-3">
          İletişim:
          {contactEmail ? ` ${contactEmail}` : " şirket iletişim kanalları"}
          {profile.phone ? ` · ${profile.phone}` : ""}. KEP adresi daha
          sonra tanımlandığında şirket iletişim bilgilerine eklenecektir.
        </p>
      </section>
    </LegalPage>
  );
}

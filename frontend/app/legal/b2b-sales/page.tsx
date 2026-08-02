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
  title: "B2B Satış Koşulları",
  description:
    "Etken Ofis kurumsal siparişlerine uygulanan B2B satış koşulları.",
};

function formatCurrency(value: number) {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function B2BSalesPage() {
  const profile = await getPublicCompanyProfile();
  const address = formatPublicCompanyAddress(profile);
  const contactEmail = profile.supportEmail || profile.email;

  return (
    <LegalPage
      eyebrow="Yasal"
      title="B2B Satış Koşulları"
      description="Kurumsal hesap üzerinden verilen ticari siparişlerde uygulanacak satış, ödeme, teslimat ve uyuşmazlık koşullarıdır."
      profileComplete={profile.isComplete}
      effectiveDate={B2B_LEGAL_POLICY.effectiveDate}
      version={B2B_LEGAL_POLICY.version}
    >
      <section>
        <h2 className="text-xl font-bold text-slate-900">
          1. Taraflar ve kapsam
        </h2>

        <p className="mt-3">
          Bu koşullar, satıcı sıfatıyla {profile.legalName} ile
          etkenofis.com platformunda kurumsal hesap açılan müşteri şirket
          arasındaki ticari ürün satışlarına uygulanır. Platform yalnızca
          ticari veya mesleki amaçla hareket eden kurumsal müşterilere
          yöneliktir. Bir işlemin hukuken tüketici işlemi sayıldığı istisnai
          hâllerde emredici tüketici mevzuatı hükümleri saklıdır.
        </p>

        <p className="mt-3">
          Satıcı adresi: {address || "şirket profilinde belirtilen adres"}.
          {profile.taxNumber
            ? ` Vergi numarası: ${profile.taxNumber}.`
            : ""}
          {profile.mersisNumber
            ? ` MERSİS numarası: ${profile.mersisNumber}.`
            : ""}
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          2. Kurumsal hesap ve yetkilendirme
        </h2>

        <p className="mt-3">
          Kurumsal hesap üzerinden işlem yapan kullanıcı, müşteri şirket
          adına sipariş vermeye ve seçtiği teslimat adresini kullanmaya
          yetkili olduğunu kabul eder. Müşteri; kullanıcılarının, rollerinin,
          adres yetkilerinin ve iletişim bilgilerinin güncel tutulmasından,
          kullanıcı adı ile şifrenin üçüncü kişilerle paylaşılmamasından
          sorumludur. Yetkisiz kullanım şüphesi gecikmeden satıcıya
          bildirilmelidir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          3. Ürün, stok, fiyat ve asgari sipariş
        </h2>

        <p className="mt-3">
          Ürün açıklaması, birim fiyat, müşteri iskontosu, KDV oranı ve
          sipariş toplamı ödeme öncesinde gösterilir. Sepet bilgileri;
          sipariş oluşturulurken güncel ürün, stok, iskonto ve vergi
          verileriyle sunucu tarafında yeniden hesaplanır. Açık yazım,
          hesaplama veya sistem hatası bulunan siparişler müşteri
          bilgilendirilerek düzeltilebilir ya da iptal edilebilir.
        </p>

        <p className="mt-3">
          Siparişin KDV hariç net tutarı en az {formatCurrency(
            B2B_LEGAL_POLICY.minimumOrderNetAmount,
          )} TL olmalıdır. Ürünlerin stokta görünmesi tek başına kesin stok
          tahsisi anlamına gelmez.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          4. Siparişin kurulması ve onay
        </h2>

        <p className="mt-3">
          Siparişin sisteme kaydedilmesi, müşteri talebinin alındığını
          gösterir. Satış; stok, fiyat, ödeme, kredi limiti, teslimat adresi
          ve operasyon koşulları kontrol edilerek sipariş onaylandığında
          kesinleşir. Kısmen karşılanabilen, tedarik edilemeyen veya teslim
          edilemeyecek siparişlerde müşteri bilgilendirilir; gerekirse
          alternatif ürün veya kısmi teslimat için onayı alınır.
        </p>

        <p className="mt-3">
          Müşteri, sipariş hazırlama aşamasına geçmeden önce yazılı iptal
          talebinde bulunabilir. Hazırlanmaya başlanmış, özel olarak tedarik
          edilmiş veya sevk edilmiş siparişlerde iptal; ürünün niteliğine,
          oluşan masraflara ve iade koşullarına göre satıcının yazılı onayına
          tabidir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          5. Ödeme, cari hesap ve fatura
        </h2>

        <p className="mt-3">
          Kullanılabilir ödeme yöntemleri sipariş ekranında gösterilir.
          Havale/EFT siparişlerinde ödeme açıklamasında sipariş numarası
          belirtilmelidir ve ödeme satıcı hesabında doğrulanmadan sevkiyat
          başlatılmayabilir. Cari hesapla verilen siparişler; müşteriye
          tanımlanan kredi limiti, mevcut bakiye, ödeme vadesi ve satıcının
          risk değerlendirmesine tabidir.
        </p>

        <p className="mt-3">
          Fatura, müşterinin sistemde kayıtlı ve teyit edilmiş ticari
          bilgileri esas alınarak mevzuata uygun biçimde düzenlenir. Yanlış
          veya eksik fatura bilgileri müşteri tarafından gecikmeden
          bildirilmelidir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          6. Teslimat, ayıp bildirimi ve iade
        </h2>

        <p className="mt-3">
          Standart teslimat bölgesi: {B2B_LEGAL_POLICY.deliveryRegion}.
          Stoklu ürünlerde hedef teslim süresi sipariş ve ödeme onayından
          sonra {B2B_LEGAL_POLICY.standardDeliveryTime} olmakla birlikte;
          sipariş hacmi, stok, trafik, tedarik ve mücbir sebep koşullarına
          göre sipariş bazında değişebilir. Teslimat, müşteri hesabında
          seçilen yetkili adrese yapılır.
        </p>

        <p className="mt-3">
          Teslimat kontrolü, ayıp bildirim süreleri, ticari iade hakkı,
          iade masrafları ve kabul edilmeyen ürünler ayrıntılı olarak
          Teslimat ve İade Politikasında düzenlenmiştir. Kanundan doğan
          ayıp hakları saklıdır.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          7. Mücbir sebep
        </h2>

        <p className="mt-3">
          Doğal afet, yangın, salgın, savaş, terör, kamu otoritesi kararı,
          ulaşım veya enerji kesintisi, yaygın sistem arızası, grev ve
          tarafların makul kontrolü dışındaki benzer olaylar nedeniyle
          yükümlülüklerin gecikmesi veya yerine getirilememesinden etkilenen
          taraf, durumu makul sürede diğer tarafa bildirir. Mücbir sebep
          devam ettiği ölçüde ilgili yükümlülük askıda kalır; siparişin
          ifası kalıcı olarak imkânsızlaşırsa taraflar siparişi sona
          erdirebilir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          8. Kişisel veriler, kayıtlar ve fikrî haklar
        </h2>

        <p className="mt-3">
          Kişisel veriler KVKK Aydınlatma Metni ve Gizlilik ve Çerez
          Politikası uyarınca işlenir. Sipariş, kullanıcı, ödeme yöntemi,
          durum ve güvenlik kayıtları; işlemlerin yürütülmesi, denetimi ve
          uyuşmazlıkların ispatı amacıyla mevzuata uygun süre boyunca
          saklanabilir. Platform tasarımı, marka, metin, görsel ve yazılım
          üzerindeki haklar sahibine aittir; yazılı izin olmadan ticari
          amaçla kopyalanamaz.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          9. Uygulanacak hukuk ve uyuşmazlık
        </h2>

        <p className="mt-3">
          Bu koşullara Türkiye Cumhuriyeti hukuku uygulanır. Tarafların
          tacir sıfatıyla gerçekleştirdiği işlemlerden doğan uyuşmazlıklarda
          {" "}{B2B_LEGAL_POLICY.jurisdiction} yetkilidir. Dava şartı
          arabuluculuk ve diğer emredici yetki hükümleri saklıdır.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          10. İletişim ve yürürlük
        </h2>

        <p className="mt-3">
          Sipariş ve satış koşullarına ilişkin bildirimler
          {contactEmail ? ` ${contactEmail}` : " şirket iletişim kanalları"}
          {profile.phone ? ` veya ${profile.phone}` : ""} üzerinden
          iletilebilir. KEP adresi tanımlandığında şirket iletişim
          bilgilerinde ayrıca yayımlanacaktır.
        </p>

        <p className="mt-3">
          Bu koşullar {B2B_LEGAL_POLICY.effectiveDate} tarihinde yürürlüğe
          girer. Esaslı değişiklikler, yürürlük tarihinden önce platformda
          yayımlanır; siparişe, siparişin verildiği tarihte yürürlükte olan
          koşullar uygulanır.
        </p>
      </section>
    </LegalPage>
  );
}

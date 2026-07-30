import type {
  Metadata,
} from "next";

import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Gizlilik ve Çerez Politikası",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Yasal"
      title="Gizlilik ve Çerez Politikası"
      description="Platformun güvenlik, gizlilik, çerez ve tarayıcı depolama yaklaşımını açıklar."
    >
      <section>
        <h2 className="text-xl font-bold text-slate-900">
          Gizlilik yaklaşımı
        </h2>

        <p className="mt-3">
          Etken, kişisel ve ticari verileri yalnızca hizmetin
          sunulması, güvenliğin sağlanması ve yasal yükümlülüklerin
          yerine getirilmesi için gerekli ölçüde kullanmayı amaçlar.
          Yetkisiz erişimi, kaybı ve kötüye kullanımı önlemek için
          makul teknik ve idari tedbirler uygulanır.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          Zorunlu çerezler
        </h2>

        <p className="mt-3">
          Oturumun güvenli biçimde sürdürülmesi, kullanıcı girişinin
          doğrulanması ve temel platform işlevleri için zorunlu
          çerezler kullanılabilir. Bu çerezler olmadan kurumsal hesap
          ve sipariş işlemleri doğru çalışmayabilir.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          Sepet verileri
        </h2>

        <p className="mt-3">
          Sepetin cihazda korunması amacıyla tarayıcının yerel
          depolama alanı kullanılabilir. Kullanıcı tarayıcı verilerini
          temizlediğinde bu bilgiler silinebilir. Fiyat, stok ve
          sipariş kuralları ödeme öncesinde sunucu tarafında yeniden
          doğrulanır.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-900">
          Analitik ve pazarlama
        </h2>

        <p className="mt-3">
          Mevcut taslakta zorunlu olmayan analitik veya pazarlama
          çerezleri tanımlanmamıştır. İleride bu tür teknolojiler
          eklenirse kullanıcı tercihlerini yöneten açık bir çerez
          paneli sunulacak ve gerekli onaylar alınacaktır.
        </p>
      </section>
    </LegalPage>
  );
}

import { products } from "../data/products";

export default function Home() {

 
  const categories = [
    {
      title: "Ofis Kırtasiye",
      icon: "📄",
      desc: "Kağıt, kalem, dosyalama ve masaüstü ürünleri",
    },
    {
      title: "Teknoloji",
      icon: "💻",
      desc: "Mouse, klavye, kablo ve ofis teknolojileri",
    },
    {
      title: "Endüstriyel",
      icon: "📦",
      desc: "Streç, koli bandı, karton bardak ve ambalaj",
    },
    {
      title: "Temizlik ve Hijyen",
      icon: "🧼",
      desc: "Temizlik kimyasalları ve hijyen ürünleri",
    },
    {
      title: "Gıda Ürünleri",
      icon: "☕",
      desc: "Çay, kahve, içecek ve mutfak ihtiyaçları",
    },
    {
      title: "İş Güvenliği",
      icon: "🦺",
      desc: "Maske, eldiven ve iş güvenliği ekipmanları",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100">

      {/* HEADER */}
      <header className="bg-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-5">

          <div>
            <h1 className="text-4xl font-bold tracking-wide">
              ETKEN
            </h1>

            <p className="text-blue-200">
              İşletmeler için Akıllı Satın Alma Platformu
            </p>
          </div>

          <nav className="flex gap-8 items-center">

            <a href="/products">Ürünler</a>

            <a href="#">Kategoriler</a>

            <a href="#">Kampanyalar</a>

            <a href="#">İletişim</a>

            <button className="bg-white text-blue-900 px-5 py-3 rounded-xl font-bold hover:bg-gray-100">
              B2B Giriş
            </button>

          </nav>

        </div>
      </header>

      {/* HERO */}

      <section className="max-w-7xl mx-auto px-8 py-20">

        <div className="max-w-4xl">

          <h2 className="text-6xl font-bold text-slate-800 leading-tight">
            Kurumsal Ofis Tedarikinde
            <span className="text-blue-900"> Yeni Nesil Platform</span>
          </h2>

          <p className="text-xl text-slate-600 mt-8 leading-9">

            Ofis kırtasiye, temizlik, ambalaj,
            teknoloji, iş güvenliği ve gıda ürünlerini
            tek platformdan yönetin.

          </p>

          {/* Arama */}

          <div className="flex mt-12 max-w-3xl">

            <input
              className="flex-1 bg-white border rounded-l-xl px-6 py-5 text-lg outline-none"
              placeholder="Ürün, Marka veya Ürün Kodu Ara..."
            />

            <button className="bg-blue-900 text-white px-10 rounded-r-xl font-bold">
              ARA
            </button>

          </div>

          <div className="flex gap-5 mt-10">

            <button className="bg-blue-900 text-white px-8 py-4 rounded-xl font-semibold">
              Ürünleri İncele
            </button>

            <button className="border-2 border-blue-900 text-blue-900 px-8 py-4 rounded-xl font-semibold">
              Teklif Al
            </button>

          </div>

        </div>

      </section>

      {/* KATEGORİLER */}

      <section className="max-w-7xl mx-auto px-8 pb-24">

        <h3 className="text-3xl font-bold mb-10">

          Popüler Kategoriler

        </h3>

        <div className="grid md:grid-cols-3 gap-8">

          {categories.map((item) => (

            <div
              key={item.title}
              className="bg-white rounded-2xl p-8 shadow hover:shadow-xl transition-all"
            >

              <div className="text-5xl">
                {item.icon}
              </div>

              <h4 className="text-2xl font-bold mt-5">
                {item.title}
              </h4>

              <p className="text-slate-500 mt-3 leading-7">
                {item.desc}
              </p>

            </div>

          ))}

        </div>

      </section>

      {/* ÖNE ÇIKAN ÜRÜNLER */}

<section className="max-w-7xl mx-auto px-8 pb-24">

  <h3 className="text-3xl font-bold mb-10">

    Öne Çıkan Ürünler

  </h3>

  <div className="grid md:grid-cols-4 gap-8">

   {products.map((product) => (

      <div
        key={product.name}
        className="bg-white rounded-2xl shadow hover:shadow-xl transition p-6"
      >

        <div className="h-40 rounded-xl bg-slate-200 flex items-center justify-center text-6xl">
          📦
        </div>

        <h4 className="mt-6 font-bold text-lg">
  {product.name}
</h4>

<p className="text-gray-500 text-sm mt-2">
  Marka: {product.brand}
</p>

<p className="text-gray-500 text-sm">
  Ürün Kodu: {product.code}
</p>

<p className="text-blue-900 text-2xl font-bold mt-4">
  {product.price.toFixed(2)} ₺
</p>

        <p className="text-green-600 mt-2">
          Stok: {product.stock} Adet
        </p>

        <button className="w-full mt-6 bg-blue-900 text-white py-3 rounded-xl font-semibold hover:bg-blue-800">
          Sepete Ekle
        </button>

      </div>

    ))}

  </div>

</section>

      {/* İSTATİSTİK */}

      <section className="bg-blue-900 text-white">

        <div className="max-w-7xl mx-auto py-16 grid md:grid-cols-4 text-center">

          <div>
            <div className="text-5xl font-bold">1000+</div>
            <div className="mt-2">Ürün</div>
          </div>

          <div>
            <div className="text-5xl font-bold">10+</div>
            <div className="mt-2">Tedarikçi</div>
          </div>

          <div>
            <div className="text-5xl font-bold">50+</div>
            <div className="mt-2">Kurumsal Müşteri</div>
          </div>

          <div>
            <div className="text-5xl font-bold">%100</div>
            <div className="mt-2">B2B Odaklı</div>
          </div>

        </div>

      </section>

      {/* FOOTER */}

      <footer className="bg-slate-900 text-white">

        <div className="max-w-7xl mx-auto px-8 py-12 flex justify-between">

          <div>

            <h3 className="text-2xl font-bold">
              ETKEN
            </h3>

            <p className="text-slate-400 mt-3">

              Kurumsal Tedarik Platformu

            </p>

          </div>

          <div className="text-right text-slate-400">

            © 2026 ETKEN Ofis Tedarik Hizmetleri Ltd. Şti.

          </div>

        </div>

      </footer>

    </main>
  );
}
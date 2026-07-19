import Link from "next/link";

type Props = {
  searchParams: Promise<{
    area?: string;
  }>;
};

export default async function AccessDeniedPage({
  searchParams,
}: Props) {
  const query = await searchParams;
  const isRfArea = query.area === "rf";

  const returnPath = isRfArea ? "/rf" : "/admin";
  const loginPath = isRfArea
    ? "/rf/login"
    : "/login";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <section className="w-full max-w-xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl font-black text-red-700">
          !
        </div>

        <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-red-700">
          Erişim Engellendi
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Bu işlem için yetkiniz bulunmuyor
        </h1>

        <p className="mt-4 text-slate-600">
          Hesabınız aktif olsa da bu sayfa veya operasyon
          için gerekli rol yetkisi tanımlanmamış. Yetki
          ihtiyacınız varsa sistem yöneticinizle iletişime
          geçin.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href={returnPath}
            className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800"
          >
            Ana Ekrana Dön
          </Link>

          <Link
            href={loginPath}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
          >
            Giriş Ekranına Dön
          </Link>
        </div>
      </section>
    </main>
  );
}
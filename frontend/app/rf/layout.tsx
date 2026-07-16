import Link from "next/link";

type Props = {
  children: React.ReactNode;
};

export default function RFLayout({
  children,
}: Props) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-slate-900 text-white shadow">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/rf"
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xl font-black">
              RF
            </div>

            <div className="min-w-0">
              <p className="truncate text-lg font-bold">
                ETKEN RF Terminal
              </p>

              <p className="truncate text-xs text-slate-400">
                Depo Operasyon Merkezi
              </p>
            </div>
          </Link>

          <Link
            href="/admin"
            className="shrink-0 rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
          >
            Admin
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
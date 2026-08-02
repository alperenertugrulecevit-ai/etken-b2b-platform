import type {
  ReactNode,
} from "react";

import Header from "@/components/layout/Header";

type LegalPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  profileComplete?: boolean;
  effectiveDate?: string;
  version?: string;
  children: ReactNode;
};

export default function LegalPage({
  eyebrow,
  title,
  description,
  profileComplete = true,
  effectiveDate,
  version,
  children,
}: LegalPageProps) {
  return (
    <main className="min-h-screen bg-slate-100">
      <Header />

      <section className="mx-auto max-w-5xl px-6 py-12 sm:px-8">
        <div className="rounded-3xl bg-white p-7 shadow-sm sm:p-10">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
            {eyebrow}
          </p>

          <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
            {title}
          </h1>

          <p className="mt-4 max-w-3xl leading-7 text-slate-600">
            {description}
          </p>

          {effectiveDate ? (
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-slate-500">
              <span>Yürürlük tarihi: {effectiveDate}</span>
              {version ? <span>Sürüm: {version}</span> : null}
            </div>
          ) : null}

          {!profileComplete ? (
            <div className="mt-7 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
              <strong>Bilgilendirme:</strong> Resmî şirket profilindeki
              zorunlu bilgiler tamamlanmadığı için bazı iletişim alanları
              gösterilemiyor. Eksik bilgiler yönetim panelinden
              tamamlanmalıdır.
            </div>
          ) : null}

          <article className="mt-9 space-y-8 text-sm leading-7 text-slate-700 sm:text-base">
            {children}
          </article>
        </div>
      </section>
    </main>
  );
}

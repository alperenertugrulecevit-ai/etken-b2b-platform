import type {
  ReactNode,
} from "react";

import Header from "@/components/layout/Header";
import {
  SITE_LEGAL_PROFILE_COMPLETE,
} from "@/modules/site/constants/site.constants";

type LegalPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export default function LegalPage({
  eyebrow,
  title,
  description,
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

          {!SITE_LEGAL_PROFILE_COMPLETE ? (
            <div className="mt-7 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
              <strong>Taslak bilgi:</strong> Resmî şirket unvanı, adres,
              vergi, MERSİS ve iletişim bilgileri henüz tanımlanmadı.
              Bu metin faaliyete geçmeden önce gerçek bilgilerle
              tamamlanmalı ve hukuki kontrolden geçirilmelidir.
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

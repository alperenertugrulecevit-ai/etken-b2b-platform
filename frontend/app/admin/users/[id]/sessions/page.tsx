import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import { prisma } from "@/lib/prisma";

import { SessionService } from "@/modules/auth/services/session.service";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

import {
  revokeUserSessionAction,
} from "./actions";

type Props = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

function formatDate(
  value: Date
) {
  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone:
        "Europe/Istanbul",
    }
  ).format(value);
}

function getSessionTypeLabel(
  sessionType: string
) {
  return sessionType === "RF"
    ? "RF Terminal"
    : "Web Yönetim";
}

export default async function UserSessionsPage({
  params,
  searchParams,
}: Props) {
  await AuthorizationService.requirePermission(
    "USER_MANAGE"
  );

  const [
    {
      id,
    },
    query,
  ] = await Promise.all([
    params,
    searchParams,
  ]);

  const [
    user,
    currentSession,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        username: true,

        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },

        authSessions: {
          orderBy: {
            createdAt: "desc",
          },

          take: 100,

          select: {
            id: true,
            sessionType: true,
            terminalCode: true,
            ipAddress: true,
            userAgent: true,
            expiresAt: true,
            lastActivityAt: true,
            revokedAt: true,
            revokeReason: true,
            createdAt: true,
          },
        },
      },
    }),

    SessionService.getCurrentSession(),
  ]);

  if (!user) {
    notFound();
  }

  const now = new Date();

  const activeSessionCount =
    user.authSessions.filter(
      (session) =>
        !session.revokedAt &&
        session.expiresAt > now
    ).length;

  const fullName =
    user.employee
      ? `${user.employee.firstName} ${user.employee.lastName}`
      : user.username;

  const revokeAction =
    revokeUserSessionAction.bind(
      null,
      user.id
    );

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
              Kullanıcı Güvenliği
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              Kullanıcı Oturumları
            </h1>

            <p className="mt-3 text-slate-600">
              <strong>
                {fullName}
              </strong>

              {" · "}

              <span>
                @{user.username}
              </span>

              {user.employee
                ?.employeeCode
                ? ` · ${user.employee.employeeCode}`
                : ""}
            </p>
          </div>

          <Link
            href={`/admin/users/${user.id}`}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Kullanıcıya Dön
          </Link>
        </div>

        {query.success && (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-800"
          >
            {query.success}
          </div>
        )}

        {query.error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800"
          >
            {query.error}
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Aktif Oturum
            </p>

            <p className="mt-2 text-3xl font-black text-emerald-700">
              {activeSessionCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Toplam Kayıt
            </p>

            <p className="mt-2 text-3xl font-black text-slate-900">
              {user.authSessions.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Gösterilen
            </p>

            <p className="mt-2 text-3xl font-black text-blue-800">
              Son 100
            </p>
          </div>
        </section>

        <section className="mt-8 space-y-4">
          {user.authSessions.length ===
          0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
              Bu kullanıcıya ait oturum
              kaydı bulunmuyor.
            </div>
          ) : (
            user.authSessions.map(
              (session) => {
                const isActive =
                  !session.revokedAt &&
                  session.expiresAt >
                    now;

                const isCurrentSession =
                  currentSession?.id ===
                  session.id;

                const statusLabel =
                  session.revokedAt
                    ? "Sonlandırıldı"
                    : session.expiresAt <=
                        now
                      ? "Süresi Doldu"
                      : "Aktif";

                const statusClass =
                  isActive
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-700";

                return (
                  <article
                    key={session.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                            {getSessionTypeLabel(
                              session.sessionType
                            )}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}
                          >
                            {statusLabel}
                          </span>

                          {isCurrentSession && (
                            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800">
                              Mevcut Oturum
                            </span>
                          )}
                        </div>

                        <dl className="mt-5 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                          <div>
                            <dt className="font-bold text-slate-500">
                              Oluşturulma
                            </dt>

                            <dd className="mt-1 text-slate-900">
                              {formatDate(
                                session.createdAt
                              )}
                            </dd>
                          </div>

                          <div>
                            <dt className="font-bold text-slate-500">
                              Son Kullanım
                            </dt>

                            <dd className="mt-1 text-slate-900">
                              {formatDate(
                                session.expiresAt
                              )}
                            </dd>
                          </div>

                          <div>
                            <dt className="font-bold text-slate-500">
                              Son Aktivite
                            </dt>

                            <dd className="mt-1 text-slate-900">
                              {session.lastActivityAt
                                ? formatDate(
                                    session.lastActivityAt
                                  )
                                : "Kayıt yok"}
                            </dd>
                          </div>

                          <div>
                            <dt className="font-bold text-slate-500">
                              IP Adresi
                            </dt>

                            <dd className="mt-1 break-all text-slate-900">
                              {session.ipAddress ??
                                "Bilinmiyor"}
                            </dd>
                          </div>

                          <div>
                            <dt className="font-bold text-slate-500">
                              Terminal
                            </dt>

                            <dd className="mt-1 text-slate-900">
                              {session.terminalCode ??
                                "Belirtilmedi"}
                            </dd>
                          </div>

                          <div>
                            <dt className="font-bold text-slate-500">
                              Sonlandırma Nedeni
                            </dt>

                            <dd className="mt-1 text-slate-900">
                              {session.revokeReason ??
                                "—"}
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Cihaz / Tarayıcı
                          </p>

                          <p className="mt-1 break-words text-sm text-slate-700">
                            {session.userAgent ??
                              "Bilinmiyor"}
                          </p>
                        </div>
                      </div>

                      {isActive &&
                        !isCurrentSession && (
                          <form
                            action={
                              revokeAction
                            }
                          >
                            <input
                              type="hidden"
                              name="sessionId"
                              value={
                                session.id
                              }
                            />

                            <button
                              type="submit"
                              className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
                            >
                              Oturumu Sonlandır
                            </button>
                          </form>
                        )}
                    </div>
                  </article>
                );
              }
            )
          )}
        </section>
      </div>
    </main>
  );
}
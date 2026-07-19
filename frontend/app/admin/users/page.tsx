import {
  UserStatus,
  UserType,
} from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  revokeUserSessionsAction,
  setRfAccessAction,
  setUserStatusAction,
} from "@/app/admin/users/actions";
import { SessionService } from "@/modules/auth/services/session.service";
import { UserService } from "@/modules/users/services/user.service";
import {
  USER_STATUS_LABELS,
  USER_TYPE_LABELS,
} from "@/modules/users/types/user.types";

type Props = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    userType?: string;
    rfAccess?: string;
    page?: string;
    success?: string;
    error?: string;
  }>;
};

function isUserStatus(
  value: string
): value is UserStatus {
  return Object.values(UserStatus).includes(
    value as UserStatus
  );
}

function isUserType(
  value: string
): value is UserType {
  return Object.values(UserType).includes(
    value as UserType
  );
}

function normalizeRfAccess(value: string) {
  if (value === "yes" || value === "no") {
    return value;
  }

  return "all" as const;
}

function formatDateTime(value: Date | null) {
  if (!value) {
    return "Henüz giriş yapmadı";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function getStatusClass(status: UserStatus) {
  const classes: Record<UserStatus, string> = {
    ACTIVE:
      "bg-emerald-100 text-emerald-800",
    PASSIVE:
      "bg-slate-200 text-slate-700",
    LOCKED:
      "bg-red-100 text-red-800",
    SUSPENDED:
      "bg-amber-100 text-amber-800",
  };

  return classes[status];
}

function createPageHref(
  query: {
    search: string;
    status: string;
    userType: string;
    rfAccess: string;
  },
  page: number
) {
  const params = new URLSearchParams();

  if (query.search) {
    params.set("search", query.search);
  }

  if (query.status) {
    params.set("status", query.status);
  }

  if (query.userType) {
    params.set("userType", query.userType);
  }

  if (query.rfAccess !== "all") {
    params.set("rfAccess", query.rfAccess);
  }

  params.set("page", String(page));

  return `/admin/users?${params.toString()}`;
}

export default async function AdminUsersPage({
  searchParams,
}: Props) {
  const currentUser =
    await SessionService.getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (!currentUser.isAdminUser) {
    redirect("/admin");
  }

  const query = await searchParams;

  const search = query.search?.trim() ?? "";
  const statusValue =
    query.status?.trim() ?? "";
  const userTypeValue =
    query.userType?.trim() ?? "";
  const rfAccess = normalizeRfAccess(
    query.rfAccess?.trim() ?? ""
  );

  const requestedPage = Number(query.page ?? "1");
  const page =
    Number.isInteger(requestedPage) &&
    requestedPage > 0
      ? requestedPage
      : 1;

  const result = await UserService.getUserList({
    search,
    status: isUserStatus(statusValue)
      ? statusValue
      : null,
    userType: isUserType(userTypeValue)
      ? userTypeValue
      : null,
    rfAccess,
    page,
    pageSize: 25,
  });

  const filterQuery = {
    search,
    status: statusValue,
    userType: userTypeValue,
    rfAccess,
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="mx-auto max-w-[1700px]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
              Yetki ve Erişim
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              Kullanıcı Yönetimi
            </h1>

            <p className="mt-2 max-w-3xl text-slate-600">
              Kullanıcı durumunu, RF erişimini ve açık
              oturumları tek ekrandan yönetin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/users/new"
              className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800"
            >
              + Yeni Kullanıcı
            </Link>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-blue-900">
              <p className="text-sm font-semibold">
                Toplam kullanıcı
              </p>
              <p className="mt-1 text-3xl font-bold">
                {result.total.toLocaleString("tr-TR")}
              </p>
            </div>
          </div>
        </div>

        {query.success && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-800">
            {query.success}
          </div>
        )}

        {query.error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800">
            {query.error}
          </div>
        )}

        <form
          method="get"
          className="mt-8 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[minmax(260px,1fr)_220px_220px_180px_auto]"
        >
          <input
            name="search"
            defaultValue={search}
            placeholder="Kullanıcı, personel veya rol ara"
            className="min-h-12 rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-600"
          />

          <select
            name="status"
            defaultValue={statusValue}
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-4"
          >
            <option value="">Tüm durumlar</option>
            {Object.values(UserStatus).map(
              (status) => (
                <option
                  key={status}
                  value={status}
                >
                  {USER_STATUS_LABELS[status]}
                </option>
              )
            )}
          </select>

          <select
            name="userType"
            defaultValue={userTypeValue}
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-4"
          >
            <option value="">Tüm kullanıcı tipleri</option>
            {Object.values(UserType).map(
              (userType) => (
                <option
                  key={userType}
                  value={userType}
                >
                  {USER_TYPE_LABELS[userType]}
                </option>
              )
            )}
          </select>

          <select
            name="rfAccess"
            defaultValue={rfAccess}
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-4"
          >
            <option value="all">Tüm RF durumları</option>
            <option value="yes">RF erişimi açık</option>
            <option value="no">RF erişimi kapalı</option>
          </select>

          <div className="flex gap-2">
            <button
              type="submit"
              className="min-h-12 rounded-xl bg-blue-700 px-5 font-bold text-white hover:bg-blue-800"
            >
              Filtrele
            </button>

            <Link
              href="/admin/users"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-5 font-bold text-slate-700 hover:bg-slate-50"
            >
              Temizle
            </Link>
          </div>
        </form>

        <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1500px] text-left">
            <thead className="bg-slate-100 text-sm uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-5 py-4">Kullanıcı</th>
                <th className="px-4 py-4">Personel</th>
                <th className="px-4 py-4">Tip / Rol</th>
                <th className="px-4 py-4">Durum</th>
                <th className="px-4 py-4">RF</th>
                <th className="px-4 py-4">Oturum</th>
                <th className="px-4 py-4">Son Giriş</th>
                <th className="px-5 py-4 text-right">
                  İşlemler
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {result.items.map((user) => {
                const isCurrentUser =
                  user.id === currentUser.id;

                return (
                  <tr
                    key={user.id}
                    className="align-top hover:bg-slate-50"
                  >
                    <td className="px-5 py-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 font-bold text-white">
                          {user.username
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-slate-950">
                              {user.username}
                            </p>

                            {user.isAdminUser && (
                              <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-bold text-violet-800">
                                Admin
                              </span>
                            )}

                            {isCurrentUser && (
                              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
                                Siz
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-sm text-slate-500">
                            {user.email ||
                              "E-posta tanımlı değil"}
                          </p>

                          {user.mustChangePassword && (
                            <p className="mt-2 text-xs font-bold text-amber-700">
                              İlk girişte şifre değişmeli
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-5">
                      {user.employee ? (
                        <>
                          <p className="font-bold text-slate-900">
                            {user.employee.firstName}{" "}
                            {user.employee.lastName}
                          </p>
                          <p className="mt-1 font-mono text-sm text-slate-500">
                            {user.employee.employeeCode}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {[
                              user.employee.department,
                              user.employee.title,
                            ]
                              .filter(Boolean)
                              .join(" / ") || "-"}
                          </p>
                        </>
                      ) : (
                        <span className="text-slate-400">
                          Personel bağlantısı yok
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-5">
                      <p className="font-semibold text-slate-800">
                        {
                          USER_TYPE_LABELS[
                            user.userType
                          ]
                        }
                      </p>

                      <div className="mt-2 flex max-w-[260px] flex-wrap gap-2">
                        {user.roles.map((role) => (
                          <span
                            key={role.id}
                            title={role.code}
                            className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700"
                          >
                            {role.name}
                          </span>
                        ))}

                        {user.roles.length === 0 && (
                          <span className="text-sm text-slate-400">
                            Rol atanmamış
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${getStatusClass(
                          user.status
                        )}`}
                      >
                        {
                          USER_STATUS_LABELS[
                            user.status
                          ]
                        }
                      </span>
                    </td>

                    <td className="px-4 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${
                          user.isRfUser
                            ? "bg-cyan-100 text-cyan-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {user.isRfUser
                          ? "Açık"
                          : "Kapalı"}
                      </span>
                    </td>

                    <td className="px-4 py-5">
                      <p className="text-2xl font-bold text-slate-900">
                        {user.activeSessionCount}
                      </p>
                      <p className="text-xs text-slate-500">
                        aktif oturum
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-600">
                      {formatDateTime(
                        user.lastLoginAt
                      )}
                    </td>

                    <td className="px-5 py-5">
                      <div className="flex flex-wrap justify-end gap-2">
                        <form
                          action={setUserStatusAction}
                        >
                          <input
                            type="hidden"
                            name="userId"
                            value={user.id}
                          />
                          <input
                            type="hidden"
                            name="status"
                            value={
                              user.status ===
                              UserStatus.ACTIVE
                                ? UserStatus.PASSIVE
                                : UserStatus.ACTIVE
                            }
                          />
                          <button
                            type="submit"
                            disabled={
                              isCurrentUser &&
                              user.status ===
                                UserStatus.ACTIVE
                            }
                            className={`rounded-lg px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300 ${
                              user.status ===
                              UserStatus.ACTIVE
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-emerald-600 hover:bg-emerald-700"
                            }`}
                          >
                            {user.status ===
                            UserStatus.ACTIVE
                              ? "Pasif Yap"
                              : "Aktifleştir"}
                          </button>
                        </form>

                        <form
                          action={setRfAccessAction}
                        >
                          <input
                            type="hidden"
                            name="userId"
                            value={user.id}
                          />
                          <input
                            type="hidden"
                            name="enabled"
                            value={String(
                              !user.isRfUser
                            )}
                          />
                          <button
                            type="submit"
                            className="rounded-lg bg-cyan-100 px-3 py-2 text-sm font-bold text-cyan-800 hover:bg-cyan-200"
                          >
                            RF{" "}
                            {user.isRfUser
                              ? "Kapat"
                              : "Aç"}
                          </button>
                        </form>

                        <form
                          action={
                            revokeUserSessionsAction
                          }
                        >
                          <input
                            type="hidden"
                            name="userId"
                            value={user.id}
                          />
                          <button
                            type="submit"
                            disabled={
                              isCurrentUser ||
                              user.activeSessionCount ===
                                0
                            }
                            className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-bold text-amber-800 hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            Oturumları Kapat
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {result.items.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-16 text-center text-slate-500"
                  >
                    Seçilen filtrelere uygun kullanıcı
                    bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-slate-600">
            Sayfa {result.page} /{" "}
            {result.totalPages} —{" "}
            {result.total.toLocaleString("tr-TR")} kayıt
          </p>

          <div className="flex gap-2">
            <Link
              href={createPageHref(
                filterQuery,
                Math.max(1, result.page - 1)
              )}
              aria-disabled={result.page <= 1}
              className={`rounded-xl border px-4 py-2 font-bold ${
                result.page <= 1
                  ? "pointer-events-none border-slate-200 text-slate-300"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Önceki
            </Link>

            <Link
              href={createPageHref(
                filterQuery,
                Math.min(
                  result.totalPages,
                  result.page + 1
                )
              )}
              aria-disabled={
                result.page >= result.totalPages
              }
              className={`rounded-xl border px-4 py-2 font-bold ${
                result.page >= result.totalPages
                  ? "pointer-events-none border-slate-200 text-slate-300"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Sonraki
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
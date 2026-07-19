import AdminSidebar from "@/components/layout/AdminSidebar";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await AuthorizationService.requireAdminPortalAccess();

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar />

      <main className="min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
}
import AdminSidebar from "@/components/layout/AdminSidebar";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-slate-100 flex">
      <AdminSidebar />

      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
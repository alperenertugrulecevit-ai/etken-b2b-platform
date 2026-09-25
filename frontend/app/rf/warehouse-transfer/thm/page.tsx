import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { WmsContextService } from "@/modules/wms-context/services/wms-context.service";
import RFWarehouseThmTransferForm from "@/components/rf/warehouse-transfer/RFWarehouseThmTransferForm";

export default async function RFWarehouseThmTransferPage() {
  const profile = await AuthorizationService.requireRfAccess("TRANSFER_EXECUTE");
  const context = await WmsContextService.requireActiveContext(
    profile.id,
    profile.isAdminUser,
  );

  const warehouses = await prisma.warehouse.findMany({
    where: {
      isActive: true,
      companyId: context.companyId,
    },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-blue-700">
            RF · Transfer İşlemleri
          </p>
          <h1 className="mt-1 text-2xl font-black">
            Depolararası Transfer THM
          </h1>
        </div>

        <Link
          href="/rf/operations/transfer"
          className="rounded-xl border bg-white px-3 py-2 font-bold"
        >
          ← Transfer
        </Link>
      </div>

      <RFWarehouseThmTransferForm warehouses={warehouses} />
    </section>
  );
}

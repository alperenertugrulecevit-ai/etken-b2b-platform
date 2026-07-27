"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export type WmsStructureActionState = {
  success: boolean;
  message: string;
};

function normalizeCode(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toUpperCase();
}

function getText(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function getOptionalText(formData: FormData, name: string) {
  return getText(formData, name) || null;
}

function getPositiveInteger(formData: FormData, name: string) {
  const value = Number(formData.get(name));
  return Number.isInteger(value) && value > 0 ? value : null;
}

function revalidateStructure() {
  revalidatePath("/admin");
  revalidatePath("/admin/wms-structure");
  revalidatePath("/admin/warehouses");
  revalidatePath("/admin/users");
}

async function getDefaultTenant() {
  const tenant = await prisma.wmsTenant.findUnique({
    where: { code: "ETKEN" },
    select: { id: true, code: true, name: true },
  });

  if (!tenant) {
    throw new Error("ETKEN WMS işletmesi bulunamadı. 3PL temel migration kaydını kontrol edin.");
  }

  return tenant;
}

function knownErrorMessage(error: unknown, fallback: string) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return "Aynı kodla kayıtlı başka bir tanım bulunuyor.";
  }

  return error instanceof Error ? error.message : fallback;
}

export async function createWmsCompanyAction(
  _previousState: WmsStructureActionState,
  formData: FormData,
): Promise<WmsStructureActionState> {
  await AuthorizationService.requirePermission("WMS_COMPANY_MANAGE");

  const code = normalizeCode(formData.get("code"));
  const name = getText(formData, "name");

  if (!code || !name) {
    return { success: false, message: "Şirket kodu ve şirket adı zorunludur." };
  }

  if (code.length > 30) {
    return { success: false, message: "Şirket kodu en fazla 30 karakter olabilir." };
  }

  try {
    const tenant = await getDefaultTenant();

    const company = await prisma.wmsCompany.create({
      data: {
        tenantId: tenant.id,
        code,
        name,
        legalName: getOptionalText(formData, "legalName"),
        taxOffice: getOptionalText(formData, "taxOffice"),
        taxNumber: getOptionalText(formData, "taxNumber"),
        phone: getOptionalText(formData, "phone"),
        email: getOptionalText(formData, "email"),
        contactName: getOptionalText(formData, "contactName"),
        address: getOptionalText(formData, "address"),
        city: getOptionalText(formData, "city"),
        district: getOptionalText(formData, "district"),
        postalCode: getOptionalText(formData, "postalCode"),
      },
      select: { code: true, name: true },
    });

    revalidateStructure();

    return {
      success: true,
      message: company.code + " - " + company.name + " şirketi oluşturuldu.",
    };
  } catch (error) {
    console.error("WMS şirketi oluşturma hatası:", error);
    return {
      success: false,
      message: knownErrorMessage(error, "Şirket oluşturulamadı."),
    };
  }
}

export async function createLogisticsCenterAction(
  _previousState: WmsStructureActionState,
  formData: FormData,
): Promise<WmsStructureActionState> {
  await AuthorizationService.requirePermission("WMS_COMPANY_MANAGE");

  const code = normalizeCode(formData.get("code"));
  const name = getText(formData, "name");

  if (!code || !name) {
    return {
      success: false,
      message: "Lojistik merkezi kodu ve adı zorunludur.",
    };
  }

  if (code.length > 30) {
    return {
      success: false,
      message: "Lojistik merkezi kodu en fazla 30 karakter olabilir.",
    };
  }

  try {
    const tenant = await getDefaultTenant();

    const center = await prisma.logisticsCenter.create({
      data: {
        tenantId: tenant.id,
        code,
        name,
        address: getOptionalText(formData, "address"),
        city: getOptionalText(formData, "city"),
        district: getOptionalText(formData, "district"),
        postalCode: getOptionalText(formData, "postalCode"),
        phone: getOptionalText(formData, "phone"),
        email: getOptionalText(formData, "email"),
      },
      select: { code: true, name: true },
    });

    revalidateStructure();

    return {
      success: true,
      message: center.code + " - " + center.name + " lojistik merkezi oluşturuldu.",
    };
  } catch (error) {
    console.error("Lojistik merkezi oluşturma hatası:", error);
    return {
      success: false,
      message: knownErrorMessage(error, "Lojistik merkezi oluşturulamadı."),
    };
  }
}

export async function connectWarehouseAction(
  _previousState: WmsStructureActionState,
  formData: FormData,
): Promise<WmsStructureActionState> {
  await AuthorizationService.requirePermission("WMS_COMPANY_MANAGE");

  const warehouseId = getPositiveInteger(formData, "warehouseId");
  const companyId = getText(formData, "companyId");
  const logisticsCenterId = getText(formData, "logisticsCenterId");

  if (!warehouseId || !companyId || !logisticsCenterId) {
    return {
      success: false,
      message: "Depo, şirket ve lojistik merkezi seçimi zorunludur.",
    };
  }

  try {
    const [company, center, warehouse] = await Promise.all([
      prisma.wmsCompany.findUnique({
        where: { id: companyId },
        select: { id: true, tenantId: true, code: true },
      }),
      prisma.logisticsCenter.findUnique({
        where: { id: logisticsCenterId },
        select: { id: true, tenantId: true, code: true },
      }),
      prisma.warehouse.findUnique({
        where: { id: warehouseId },
        select: { id: true, code: true, name: true },
      }),
    ]);

    if (!company || !center || !warehouse) {
      return {
        success: false,
        message: "Seçilen şirket, merkez veya depo kaydı bulunamadı.",
      };
    }

    if (company.tenantId !== center.tenantId) {
      return {
        success: false,
        message: "Şirket ve lojistik merkezi aynı WMS işletmesine ait olmalıdır.",
      };
    }

    await prisma.warehouse.update({
      where: { id: warehouse.id },
      data: {
        tenantId: company.tenantId,
        companyId: company.id,
        logisticsCenterId: center.id,
      },
    });

    revalidateStructure();

    return {
      success: true,
      message:
        warehouse.code + " - " + warehouse.name + " deposu " +
        company.code + " şirketine ve " + center.code + " merkezine bağlandı.",
    };
  } catch (error) {
    console.error("Depo şirket bağlantısı hatası:", error);
    return {
      success: false,
      message: knownErrorMessage(error, "Depo bağlantısı güncellenemedi."),
    };
  }
}

export async function assignWmsAccessAction(
  _previousState: WmsStructureActionState,
  formData: FormData,
): Promise<WmsStructureActionState> {
  await AuthorizationService.requirePermission("WMS_ACCESS_MANAGE");

  const userId = getText(formData, "userId");
  const companyId = getText(formData, "companyId");
  const requestedWarehouseIds = formData
    .getAll("warehouseIds")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (!userId || !companyId) {
    return {
      success: false,
      message: "Kullanıcı ve şirket seçimi zorunludur.",
    };
  }

  try {
    const [user, company, warehouses] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          isAdminUser: true,
        },
      }),
      prisma.wmsCompany.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          tenantId: true,
          code: true,
          name: true,
        },
      }),
      prisma.warehouse.findMany({
        where: { id: { in: requestedWarehouseIds } },
        select: {
          id: true,
          companyId: true,
          tenantId: true,
        },
      }),
    ]);

    if (!user || !company) {
      return {
        success: false,
        message: "Kullanıcı veya şirket kaydı bulunamadı.",
      };
    }

    if (
      warehouses.some(
        (warehouse) =>
          warehouse.companyId !== company.id ||
          warehouse.tenantId !== company.tenantId,
      )
    ) {
      return {
        success: false,
        message: "Seçilen depolardan biri bu şirkete ait değil.",
      };
    }

    const currentCompanyAccessCount = await prisma.userCompanyAccess.count({
      where: {
        userId: user.id,
        isActive: true,
      },
    });

    await prisma.$transaction(async (transaction) => {
      await transaction.wmsTenantMembership.upsert({
        where: {
          wms_tenant_user_unique: {
            tenantId: company.tenantId,
            userId: user.id,
          },
        },
        update: {
          isActive: true,
          isTenantAdmin: user.isAdminUser,
        },
        create: {
          tenantId: company.tenantId,
          userId: user.id,
          isActive: true,
          isTenantAdmin: user.isAdminUser,
        },
      });

      await transaction.userCompanyAccess.upsert({
        where: {
          wms_company_user_unique: {
            companyId: company.id,
            userId: user.id,
          },
        },
        update: {
          tenantId: company.tenantId,
          canView: true,
          canOperate: true,
          canManage: user.isAdminUser,
          isActive: true,
        },
        create: {
          tenantId: company.tenantId,
          companyId: company.id,
          userId: user.id,
          canView: true,
          canOperate: true,
          canManage: user.isAdminUser,
          isDefault: currentCompanyAccessCount === 0,
          isActive: true,
        },
      });

      await transaction.userWarehouseAccess.deleteMany({
        where: {
          userId: user.id,
          warehouse: {
            companyId: company.id,
          },
        },
      });

      for (const [index, warehouse] of warehouses.entries()) {
        await transaction.userWarehouseAccess.create({
          data: {
            tenantId: company.tenantId,
            warehouseId: warehouse.id,
            userId: user.id,
            canView: true,
            canOperate: true,
            canManage: user.isAdminUser,
            isDefault: currentCompanyAccessCount === 0 && index === 0,
            isActive: true,
          },
        });
      }
    });

    revalidateStructure();

    return {
      success: true,
      message:
        user.username + " kullanıcısına " + company.code + " - " +
        company.name + " şirketi ve " + warehouses.length +
        " depo erişimi atandı.",
    };
  } catch (error) {
    console.error("WMS erişim atama hatası:", error);
    return {
      success: false,
      message: knownErrorMessage(error, "Kullanıcı erişimi atanamadı."),
    };
  }
}

export async function toggleWmsCompanyStatusAction(
  companyId: string,
  currentStatus: boolean,
) {
  await AuthorizationService.requirePermission("WMS_COMPANY_MANAGE");

  await prisma.wmsCompany.update({
    where: { id: companyId },
    data: { isActive: !currentStatus },
  });

  revalidateStructure();
}

export async function toggleLogisticsCenterStatusAction(
  centerId: string,
  currentStatus: boolean,
) {
  await AuthorizationService.requirePermission("WMS_COMPANY_MANAGE");

  await prisma.logisticsCenter.update({
    where: { id: centerId },
    data: { isActive: !currentStatus },
  });

  revalidateStructure();
}

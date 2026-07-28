import "server-only";

import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

import { WMS_CONTEXT_CONSTANTS } from "@/modules/wms-context/constants/wms-context.constants";

import type {
  ActiveWmsContext,
  WmsContextCompanyOption,
  WmsContextSelectorData,
} from "@/modules/wms-context/types/wms-context.types";

export class WmsContextService {
  static async getAvailableContexts(
    userId: string,
    isAdminUser: boolean
  ): Promise<WmsContextCompanyOption[]> {
    if (isAdminUser) {
      const companies =
        await prisma.wmsCompany.findMany({
          where: {
            isActive: true,
            tenant: {
              isActive: true,
            },
          },
          orderBy: [
            {
              code: "asc",
            },
          ],
          select: {
            id: true,
            tenantId: true,
            code: true,
            name: true,
            warehouses: {
              where: {
                isActive: true,
                logisticsCenter: {
                  isActive: true,
                },
              },
              orderBy: {
                code: "asc",
              },
              select: {
                id: true,
                code: true,
                name: true,
                logisticsCenter: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

      return companies.map(
        (company, companyIndex) => ({
          id: company.id,
          tenantId: company.tenantId,
          code: company.code,
          name: company.name,
          isDefault:
            companyIndex === 0,
          warehouses:
            company.warehouses.map(
              (
                warehouse,
                warehouseIndex
              ) => ({
                id: warehouse.id,
                code: warehouse.code,
                name: warehouse.name,
                logisticsCenterCode:
                  warehouse
                    .logisticsCenter
                    .code,
                logisticsCenterName:
                  warehouse
                    .logisticsCenter
                    .name,
                isDefault:
                  warehouseIndex ===
                  0,
              })
            ),
        })
      );
    }

    const [
      companyAccesses,
      warehouseAccesses,
    ] = await Promise.all([
      prisma.userCompanyAccess.findMany({
        where: {
          userId,
          isActive: true,
          canView: true,
          company: {
            isActive: true,
            tenant: {
              isActive: true,
            },
          },
        },
        orderBy: [
          {
            isDefault: "desc",
          },
          {
            company: {
              code: "asc",
            },
          },
        ],
        select: {
          tenantId: true,
          companyId: true,
          isDefault: true,
          company: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      }),

      prisma.userWarehouseAccess.findMany({
        where: {
          userId,
          isActive: true,
          canView: true,
          warehouse: {
            isActive: true,
            company: {
              isActive: true,
            },
            logisticsCenter: {
              isActive: true,
            },
          },
        },
        orderBy: [
          {
            isDefault: "desc",
          },
          {
            warehouse: {
              code: "asc",
            },
          },
        ],
        select: {
          tenantId: true,
          warehouseId: true,
          isDefault: true,
          warehouse: {
            select: {
              companyId: true,
              code: true,
              name: true,
              logisticsCenter: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return companyAccesses.map(
      (companyAccess) => ({
        id: companyAccess.companyId,
        tenantId:
          companyAccess.tenantId,
        code:
          companyAccess.company.code,
        name:
          companyAccess.company.name,
        isDefault:
          companyAccess.isDefault,
        warehouses:
          warehouseAccesses
            .filter(
              (warehouseAccess) =>
                warehouseAccess
                  .warehouse
                  .companyId ===
                  companyAccess.companyId &&
                warehouseAccess
                  .tenantId ===
                  companyAccess.tenantId
            )
            .map(
              (warehouseAccess) => ({
                id:
                  warehouseAccess
                    .warehouseId,
                code:
                  warehouseAccess
                    .warehouse.code,
                name:
                  warehouseAccess
                    .warehouse.name,
                logisticsCenterCode:
                  warehouseAccess
                    .warehouse
                    .logisticsCenter
                    .code,
                logisticsCenterName:
                  warehouseAccess
                    .warehouse
                    .logisticsCenter
                    .name,
                isDefault:
                  warehouseAccess
                    .isDefault,
              })
            ),
      })
    );
  }

  static async getSelectorData(
    userId: string,
    isAdminUser: boolean
  ): Promise<WmsContextSelectorData> {
    const companies =
      await WmsContextService.getAvailableContexts(
        userId,
        isAdminUser
      );

    const cookieStore =
      await cookies();

    const requestedCompanyId =
      cookieStore.get(
        WMS_CONTEXT_CONSTANTS
          .COMPANY_COOKIE_NAME
      )?.value ?? null;

    const requestedWarehouseId =
      Number(
        cookieStore.get(
          WMS_CONTEXT_CONSTANTS
            .WAREHOUSE_COOKIE_NAME
        )?.value
      );

    const selectedCompany =
      companies.find(
        (company) =>
          company.id ===
          requestedCompanyId
      ) ??
      companies.find(
        (company) =>
          company.isDefault
      ) ??
      companies[0] ??
      null;

    if (!selectedCompany) {
      return {
        activeContext: null,
        companies,
      };
    }

    const selectedWarehouse =
      selectedCompany.warehouses.find(
        (warehouse) =>
          warehouse.id ===
          requestedWarehouseId
      ) ??
      selectedCompany.warehouses.find(
        (warehouse) =>
          warehouse.isDefault
      ) ??
      selectedCompany.warehouses[0] ??
      null;

    if (!selectedWarehouse) {
      return {
        activeContext: null,
        companies,
      };
    }

    return {
      activeContext: {
        tenantId:
          selectedCompany.tenantId,
        companyId:
          selectedCompany.id,
        companyCode:
          selectedCompany.code,
        companyName:
          selectedCompany.name,
        warehouseId:
          selectedWarehouse.id,
        warehouseCode:
          selectedWarehouse.code,
        warehouseName:
          selectedWarehouse.name,
        logisticsCenterCode:
          selectedWarehouse
            .logisticsCenterCode,
        logisticsCenterName:
          selectedWarehouse
            .logisticsCenterName,
      },
      companies,
    };
  }

  static async requireActiveContext(
    userId: string,
    isAdminUser: boolean
  ): Promise<ActiveWmsContext> {
    const selectorData =
      await WmsContextService.getSelectorData(
        userId,
        isAdminUser
      );

    if (!selectorData.activeContext) {
      throw new Error(
        "Kullanabileceğiniz aktif şirket ve depo bulunamadı."
      );
    }

    return selectorData.activeContext;
  }

  static async setActiveContext(
    userId: string,
    isAdminUser: boolean,
    companyId: string,
    warehouseId: number
  ): Promise<ActiveWmsContext> {
    const companies =
      await WmsContextService.getAvailableContexts(
        userId,
        isAdminUser
      );

    const company = companies.find(
      (item) =>
        item.id === companyId
    );

    const warehouse =
      company?.warehouses.find(
        (item) =>
          item.id === warehouseId
      );

    if (!company || !warehouse) {
      throw new Error(
        "Seçilen şirket veya depo için erişim yetkiniz bulunmuyor."
      );
    }

    const cookieStore =
      await cookies();

    const cookieOptions = {
      httpOnly: true,
      sameSite:
        "lax" as const,
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
      maxAge:
        WMS_CONTEXT_CONSTANTS
          .COOKIE_MAX_AGE_SECONDS,
    };

    cookieStore.set(
      WMS_CONTEXT_CONSTANTS
        .COMPANY_COOKIE_NAME,
      company.id,
      cookieOptions
    );

    cookieStore.set(
      WMS_CONTEXT_CONSTANTS
        .WAREHOUSE_COOKIE_NAME,
      String(
        warehouse.id
      ),
      cookieOptions
    );

    return {
      tenantId: company.tenantId,
      companyId: company.id,
      companyCode: company.code,
      companyName: company.name,
      warehouseId: warehouse.id,
      warehouseCode: warehouse.code,
      warehouseName: warehouse.name,
      logisticsCenterCode:
        warehouse
          .logisticsCenterCode,
      logisticsCenterName:
        warehouse
          .logisticsCenterName,
    };
  }

  static async clearActiveContext():
    Promise<void> {
    const cookieStore =
      await cookies();

    cookieStore.delete(
      WMS_CONTEXT_CONSTANTS
        .COMPANY_COOKIE_NAME
    );

    cookieStore.delete(
      WMS_CONTEXT_CONSTANTS
        .WAREHOUSE_COOKIE_NAME
    );
  }
}

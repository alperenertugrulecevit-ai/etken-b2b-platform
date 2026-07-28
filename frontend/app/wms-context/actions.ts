"use server";

import { revalidatePath } from "next/cache";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";
import { WmsContextService } from "@/modules/wms-context/services/wms-context.service";

export type WmsContextActionState = {
  success: boolean;
  message: string;
};

export async function changeWmsContextAction(
  _previousState: WmsContextActionState,
  formData: FormData
): Promise<WmsContextActionState> {
  const profile =
    await AuthorizationService.getCurrentProfile();

  if (!profile) {
    return {
      success: false,
      message:
        "Oturum bulunamadı. Lütfen yeniden giriş yapın.",
    };
  }

  const companyId = String(
    formData.get("companyId") ?? ""
  ).trim();

  const warehouseId = Number(
    formData.get("warehouseId")
  );

  if (
    !companyId ||
    !Number.isInteger(
      warehouseId
    ) ||
    warehouseId <= 0
  ) {
    return {
      success: false,
      message:
        "Şirket ve depo seçimi zorunludur.",
    };
  }

  try {
    const context =
      await WmsContextService.setActiveContext(
        profile.id,
        profile.isAdminUser,
        companyId,
        warehouseId
      );

    revalidatePath(
      "/admin",
      "layout"
    );

    revalidatePath(
      "/rf",
      "layout"
    );

    return {
      success: true,
      message:
        context.companyCode +
        " / " +
        context.warehouseCode +
        " çalışma alanı seçildi.",
    };
  } catch (error) {
    console.error(
      "Aktif WMS bağlamı değiştirme hatası:",
      error
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Çalışma alanı değiştirilemedi.",
    };
  }
}

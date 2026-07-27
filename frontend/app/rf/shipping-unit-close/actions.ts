"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  closeWaveShippingUnitAction,
} from "@/app/rf/packing/actions";

export type RFShippingUnitCloseState = {
  success: boolean;
  message: string;
  shippingHandlingUnitBarcode: string;
};

function createState(
  success: boolean,
  message: string,
  shippingHandlingUnitBarcode = ""
): RFShippingUnitCloseState {
  return {
    success,
    message,
    shippingHandlingUnitBarcode,
  };
}

function normalizeBarcode(
  value: FormDataEntryValue | null
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

export async function closeShippingUnitAction(
  _previousState: RFShippingUnitCloseState,
  formData: FormData
): Promise<RFShippingUnitCloseState> {
  const shippingHandlingUnitBarcode =
    normalizeBarcode(
      formData.get(
        "shippingHandlingUnitBarcode"
      )
    );

  const terminalCode =
    normalizeBarcode(
      formData.get(
        "terminalCode"
      )
    );

  if (
    !shippingHandlingUnitBarcode
  ) {
    return createState(
      false,
      "Kapatılacak Sevk THM barkodunu okutun."
    );
  }

  const result =
    await closeWaveShippingUnitAction(
      shippingHandlingUnitBarcode,
      terminalCode
    );

  revalidatePath(
    "/rf/shipping-unit-close"
  );

  revalidatePath(
    "/rf/packing-list-preview"
  );

  revalidatePath(
    "/rf/packing-list-print"
  );

  revalidatePath(
    "/rf/shipping"
  );

  revalidatePath(
    "/admin/handling-units"
  );

  return createState(
    result.success,
    result.message,
    shippingHandlingUnitBarcode
  );
}
"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

export type BarcodePrinterActionState = {
  success: boolean;
  message: string;
};

function createState(
  success: boolean,
  message: string
): BarcodePrinterActionState {
  return {
    success,
    message,
  };
}

function readText(
  formData: FormData,
  fieldName: string
) {
  return String(
    formData.get(fieldName) ?? ""
  ).trim();
}

function readUpperText(
  formData: FormData,
  fieldName: string
) {
  return readText(
    formData,
    fieldName
  ).toUpperCase();
}

function readPositiveInteger(
  formData: FormData,
  fieldName: string
) {
  const value = Number(
    formData.get(fieldName)
  );

  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    return null;
  }

  return value;
}

function parseIpv4Address(
  value: string
) {
  const parts = value
    .trim()
    .split(".")
    .map(Number);

  if (
    parts.length !== 4 ||
    parts.some(
      (part) =>
        !Number.isInteger(part) ||
        part < 0 ||
        part > 255
    )
  ) {
    return null;
  }

  return parts;
}

function isPrivateIpv4Address(
  value: string
) {
  const parts =
    parseIpv4Address(value);

  if (!parts) {
    return false;
  }

  const [
    first,
    second,
  ] = parts;

  if (first === 10) {
    return true;
  }

  if (
    first === 172 &&
    second >= 16 &&
    second <= 31
  ) {
    return true;
  }

  if (
    first === 192 &&
    second === 168
  ) {
    return true;
  }

  return false;
}

function revalidatePrinterPaths() {
  revalidatePath(
    "/admin/barcode-printers"
  );

  revalidatePath(
    "/rf/packing-list-print"
  );
}

export async function createBarcodePrinterAction(
  _previousState: BarcodePrinterActionState,
  formData: FormData
): Promise<BarcodePrinterActionState> {
  await AuthorizationService.requirePermission(
    "HANDLING_UNIT_MANAGE"
  );

  const code =
    readUpperText(
      formData,
      "code"
    );

  const name =
    readText(
      formData,
      "name"
    );

  const ipAddress =
    readText(
      formData,
      "ipAddress"
    );

  const port =
    readPositiveInteger(
      formData,
      "port"
    );

  const dpi =
    readPositiveInteger(
      formData,
      "dpi"
    );

  const description =
    readText(
      formData,
      "description"
    ) || null;

  if (!code) {
    return createState(
      false,
      "Yazıcı kodunu girin."
    );
  }

  if (
    !/^[A-Z0-9_-]+$/.test(
      code
    )
  ) {
    return createState(
      false,
      "Yazıcı kodunda yalnızca harf, rakam, alt çizgi ve kısa çizgi kullanılabilir."
    );
  }

  if (code.length > 30) {
    return createState(
      false,
      "Yazıcı kodu en fazla 30 karakter olabilir."
    );
  }

  if (!name) {
    return createState(
      false,
      "Yazıcı adını girin."
    );
  }

  if (name.length > 100) {
    return createState(
      false,
      "Yazıcı adı en fazla 100 karakter olabilir."
    );
  }

  if (
    !isPrivateIpv4Address(
      ipAddress
    )
  ) {
    return createState(
      false,
      "Yazıcı IP adresi 10.x.x.x, 172.16-31.x.x veya 192.168.x.x aralığında olmalıdır."
    );
  }

  if (port !== 9100) {
    return createState(
      false,
      "Doğrudan ZPL baskısı için yazıcı portu 9100 olmalıdır."
    );
  }

  if (
    dpi !== 203 &&
    dpi !== 300
  ) {
    return createState(
      false,
      "Yazıcı çözünürlüğü 203 veya 300 DPI olmalıdır."
    );
  }

  if (
    description &&
    description.length > 500
  ) {
    return createState(
      false,
      "Açıklama en fazla 500 karakter olabilir."
    );
  }

  try {
    const printer =
      await prisma.barcodePrinter.create({
        data: {
          code,
          name,
          ipAddress,
          port,
          dpi,

          labelWidthMm: 100,
          labelHeightMm: 100,

          commandLanguage: "ZPL",
          isActive: true,
          description,
        },

        select: {
          code: true,
          name: true,
        },
      });

    revalidatePrinterPaths();

    return createState(
      true,
      `${printer.code} — ${printer.name} barkod yazıcısı oluşturuldu.`
    );
  } catch (error) {
    console.error(
      "Barkod yazıcısı oluşturma hatası:",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return createState(
        false,
        "Bu yazıcı koduyla kayıtlı başka bir barkod yazıcısı bulunuyor."
      );
    }

    return createState(
      false,
      error instanceof Error
        ? error.message
        : "Barkod yazıcısı oluşturulurken beklenmeyen bir hata oluştu."
    );
  }
}

export async function toggleBarcodePrinterStatusAction(
  formData: FormData
): Promise<void> {
  await AuthorizationService.requirePermission(
    "HANDLING_UNIT_MANAGE"
  );

  const printerId =
    readText(
      formData,
      "printerId"
    );

  if (!printerId) {
    return;
  }

  const printer =
    await prisma.barcodePrinter.findUnique({
      where: {
        id: printerId,
      },

      select: {
        id: true,
        isActive: true,
      },
    });

  if (!printer) {
    return;
  }

  await prisma.barcodePrinter.update({
    where: {
      id: printer.id,
    },

    data: {
      isActive:
        !printer.isActive,
    },
  });

  revalidatePrinterPaths();
}
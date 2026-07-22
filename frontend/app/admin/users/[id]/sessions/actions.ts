"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import { prisma } from "@/lib/prisma";

import { SessionRepository } from "@/modules/auth/repositories/session.repository";

import { SessionService } from "@/modules/auth/services/session.service";

import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

function createSessionsUrl(
  userId: string,
  type: "success" | "error",
  message: string
) {
  const parameters =
    new URLSearchParams({
      [type]: message,
    });

  return (
    `/admin/users/${userId}/sessions?` +
    parameters.toString()
  );
}

function getErrorMessage(
  error: unknown
) {
  return error instanceof Error
    ? error.message
    : "Oturum sonlandırılamadı.";
}

export async function revokeUserSessionAction(
  userId: string,
  formData: FormData
): Promise<void> {
  const currentUser =
    await AuthorizationService.requirePermission(
      "USER_MANAGE"
    );

  const normalizedUserId =
    userId.trim();

  const sessionId =
    String(
      formData.get(
        "sessionId"
      ) ?? ""
    ).trim();

  let successMessage = "";

  try {
    if (!normalizedUserId) {
      throw new Error(
        "Kullanıcı bilgisi bulunamadı."
      );
    }

    if (!sessionId) {
      throw new Error(
        "Sonlandırılacak oturum bilgisi bulunamadı."
      );
    }

    const [
      currentSession,
      targetSession,
    ] = await Promise.all([
      SessionService.getCurrentSession(),

      prisma.authSession.findFirst({
        where: {
          id: sessionId,
          userId:
            normalizedUserId,
        },

        select: {
          id: true,
          revokedAt: true,
          expiresAt: true,

          user: {
            select: {
              username: true,
            },
          },
        },
      }),
    ]);

    if (!targetSession) {
      throw new Error(
        "Oturum bulunamadı veya bu kullanıcıya ait değil."
      );
    }

    if (
      currentSession?.id ===
      targetSession.id
    ) {
      throw new Error(
        "Kullanmakta olduğunuz mevcut oturumu bu ekrandan sonlandıramazsınız."
      );
    }

    if (
      targetSession.revokedAt
    ) {
      throw new Error(
        "Bu oturum daha önce sonlandırılmış."
      );
    }

    if (
      targetSession.expiresAt <=
      new Date()
    ) {
      throw new Error(
        "Bu oturumun süresi zaten dolmuş."
      );
    }

    await SessionRepository.revokeById(
      targetSession.id,
      "Yönetici tarafından tekil olarak sonlandırıldı.",
      currentUser.id
    );

    successMessage =
      `${targetSession.user.username} kullanıcısının seçilen oturumu sonlandırıldı.`;
  } catch (error) {
    redirect(
      createSessionsUrl(
        normalizedUserId,
        "error",
        getErrorMessage(error)
      )
    );
  }

  revalidatePath(
    `/admin/users/${normalizedUserId}`
  );

  revalidatePath(
    `/admin/users/${normalizedUserId}/sessions`
  );

  redirect(
    createSessionsUrl(
      normalizedUserId,
      "success",
      successMessage
    )
  );
}
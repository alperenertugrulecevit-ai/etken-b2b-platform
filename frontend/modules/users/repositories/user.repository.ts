import {
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type {
  UserListFilters,
  UserListItem,
} from "@/modules/users/types/user.types";

type NormalizedUserListFilters =
  Required<
    Pick<
      UserListFilters,
      "page" | "pageSize"
    >
  > &
    Omit<
      UserListFilters,
      "page" | "pageSize"
    >;

export class UserRepository {
  static async findMany(
    filters: NormalizedUserListFilters
  ): Promise<{
    items: UserListItem[];
    total: number;
  }> {
    const now = new Date();
    const search = filters.search?.trim() ?? "";

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        {
          username: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          employee: {
            is: {
              OR: [
                {
                  employeeCode: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  firstName: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  lastName: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            },
          },
        },
        {
          userRoles: {
            some: {
              role: {
                OR: [
                  {
                    code: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                ],
              },
            },
          },
        },
      ];
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.userType) {
      where.userType = filters.userType;
    }

    if (filters.rfAccess === "yes") {
      where.isRfUser = true;
    }

    if (filters.rfAccess === "no") {
      where.isRfUser = false;
    }

    const [records, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip:
          (filters.page - 1) *
          filters.pageSize,
        take: filters.pageSize,
        orderBy: [
          {
            isAdminUser: "desc",
          },
          {
            username: "asc",
          },
        ],
        select: {
          id: true,
          username: true,
          email: true,
          userType: true,
          status: true,
          mustChangePassword: true,
          isRfUser: true,
          isAdminUser: true,
          lastLoginAt: true,
          createdAt: true,
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              department: true,
              title: true,
            },
          },
          userRoles: {
            orderBy: {
              role: {
                name: "asc",
              },
            },
            select: {
              role: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
          authSessions: {
            where: {
              revokedAt: null,
              expiresAt: {
                gt: now,
              },
            },
            select: {
              id: true,
            },
          },
        },
      }),
      prisma.user.count({
        where,
      }),
    ]);

    return {
      total,
      items: records.map((record) => ({
        id: record.id,
        username: record.username,
        email: record.email,
        userType: record.userType,
        status: record.status,
        mustChangePassword:
          record.mustChangePassword,
        isRfUser: record.isRfUser,
        isAdminUser: record.isAdminUser,
        lastLoginAt: record.lastLoginAt,
        createdAt: record.createdAt,
        employee: record.employee,
        roles: record.userRoles.map(
          (userRole) => userRole.role
        ),
        activeSessionCount:
          record.authSessions.length,
      })),
    };
  }
}
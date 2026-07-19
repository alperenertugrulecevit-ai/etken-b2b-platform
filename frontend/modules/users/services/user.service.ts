import type {
  UserListFilters,
  UserListResult,
} from "@/modules/users/types/user.types";
import { UserRepository } from "@/modules/users/repositories/user.repository";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function normalizePositiveInteger(
  value: number | undefined,
  fallback: number
) {
  if (
    !Number.isInteger(value) ||
    !value ||
    value < 1
  ) {
    return fallback;
  }

  return value;
}

export class UserService {
  static async getUserList(
    filters: UserListFilters = {}
  ): Promise<UserListResult> {
    const page = normalizePositiveInteger(
      filters.page,
      DEFAULT_PAGE
    );

    const requestedPageSize =
      normalizePositiveInteger(
        filters.pageSize,
        DEFAULT_PAGE_SIZE
      );

    const pageSize = Math.min(
      requestedPageSize,
      MAX_PAGE_SIZE
    );

    const result =
      await UserRepository.findMany({
        search: filters.search?.trim() || "",
        status: filters.status ?? null,
        userType: filters.userType ?? null,
        rfAccess: filters.rfAccess ?? "all",
        page,
        pageSize,
      });

    const totalPages = Math.max(
      1,
      Math.ceil(result.total / pageSize)
    );

    return {
      items: result.items,
      total: result.total,
      page,
      pageSize,
      totalPages,
    };
  }
}
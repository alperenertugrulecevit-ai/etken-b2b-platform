import {
  fileURLToPath,
} from "node:url";

import {
  defineConfig,
} from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@",
        replacement:
          fileURLToPath(
            new URL(
              "./",
              import.meta.url
            )
          ),
      },
      {
        find: "server-only",
        replacement:
          fileURLToPath(
            new URL(
              "./tests/stubs/server-only.ts",
              import.meta.url
            )
          ),
      },
    ],
  },
  test: {
    environment: "node",
    include: [
      "tests/**/*.test.ts",
    ],
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: [
        "text",
        "html",
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 95,
        lines: 80,
      },
      include: [
        "lib/stock/stock-utils.ts",
        "modules/b2b/services/b2b-checkout.service.ts",
        "modules/b2b/services/customer-account.service.ts",
        "modules/b2b/services/customer-user-access.service.ts",
        "app/admin/orders/[id]/actions.ts",
      ],
    },
  },
});

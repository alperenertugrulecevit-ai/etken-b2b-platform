import "dotenv/config";

import {
  defineConfig,
} from "prisma/config";

const databaseUrl =
  process.env["DATABASE_URL"];

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL ortam değişkeni tanımlı değil."
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },

  datasource: {
    url: databaseUrl,
  },
});
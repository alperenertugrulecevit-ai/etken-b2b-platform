import type {
  PrismaClient,
} from "@prisma/client";

import {
  seedPermissions,
} from "./permissions.seed";

import {
  seedRoles,
} from "./roles.seed";

import {
  seedProducts,
} from "./products.seed";

export async function runSeeds(
  prisma: PrismaClient
) {
  console.log("---------------");
  console.log("Seed başladı...");
  console.log("---------------");

  await seedPermissions(prisma);
  await seedRoles(prisma);
  await seedProducts(prisma);

  console.log("---------------");
  console.log("Seed tamamlandı.");
  console.log("---------------");
}
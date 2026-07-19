import { PrismaClient } from "@prisma/client";

import { seedProducts } from "./products.seed";

export async function runSeeds(
  prisma: PrismaClient
) {
  console.log("---------------");
  console.log("Seed başladı...");
  console.log("---------------");

  await seedProducts(prisma);

  console.log("---------------");
  console.log("Seed tamamlandı.");
  console.log("---------------");
}
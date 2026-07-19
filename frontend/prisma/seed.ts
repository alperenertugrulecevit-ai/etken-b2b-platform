import { PrismaClient } from "@prisma/client";

import { runSeeds } from "./seed/index";

const prisma = new PrismaClient();

async function main() {
  await runSeeds(prisma);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("✅ Tüm seed işlemleri tamamlandı.");
  })
  .catch(async (error) => {
    console.error(error);

    await prisma.$disconnect();

    process.exit(1);
  });
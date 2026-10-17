/**
 * One-time, idempotent category reconciliation for paper products.
 * Preview: npx tsx scripts/reconcile-paper-categories.ts
 * Apply:   npx tsx scripts/reconcile-paper-categories.ts --apply
 *
 * Never changes prices, stock, images, SKU, VAT or activation.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");
const rootName = "Kağıt Ürünleri";
const subcategories = [
  { name: "Kağıt Havlu", slug: "kagit-havlu", aliases: ["Kağıt Havlu", "Hareketli Havlu", "İçten Çekmeli Havlu"] },
  { name: "Tuvalet Kağıdı", slug: "tuvalet-kagidi", aliases: ["Tuvalet Kağıdı"] },
  { name: "Peçete ve Mendil", slug: "pecete-ve-mendil", aliases: ["Peçete ve Mendil", "Peçete", "Mendil"] },
  { name: "Islak Mendil", slug: "islak-mendil", aliases: ["Islak Mendil"] },
] as const;

async function main() {
  const existing = await prisma.category.findMany({
    where: { OR: [{ name: rootName }, ...subcategories.map((item) => ({ name: item.name }))] },
    select: { id: true, name: true, parentId: true, slug: true },
  });
  const root = existing.find((item) => item.name === rootName && item.parentId === null);
  const conflictingRoot = existing.find((item) => item.name === rootName && item.parentId !== null);
  if (conflictingRoot) throw new Error("Kağıt Ürünleri exists as a subcategory; resolve the hierarchy before applying.");
  const plans = await Promise.all(subcategories.map(async (item) => ({
    name: item.name,
    existing: existing.find((category) => category.name === item.name && category.parentId === root?.id),
    matchingProducts: await prisma.product.count({ where: { category: { in: [...item.aliases] } } }),
  })));
  console.log(JSON.stringify({ mode: apply ? "APPLY" : "PREVIEW", root, plans }, null, 2));
  if (!apply) return;
  await prisma.$transaction(async (tx) => {
    const paper = root
      ? await tx.category.update({ where: { id: root.id }, data: { isActive: true } })
      : await tx.category.create({ data: { name: rootName, slug: "kagit-urunleri", isActive: true } });
    if (paper.name !== rootName || paper.parentId !== null) {
      throw new Error("kagit-urunleri slug conflicts with a different category.");
    }
    for (const item of subcategories) {
      const existingChild = await tx.category.findFirst({
        where: { name: item.name, parentId: paper.id },
      });
      const child = existingChild ?? await tx.category.create({
        data: { name: item.name, slug: `kagit-urunleri-${item.slug}`, parentId: paper.id, isActive: true },
      });
      await tx.category.update({ where: { id: child.id }, data: { isActive: true } });
      const updated = await tx.product.updateMany({
        where: { category: { in: [...item.aliases] } },
        data: { categoryId: child.id, category: item.name },
      });
      console.log(`${item.name}: ${updated.count} product(s) reconciled`);
    }
  });
}

main().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });

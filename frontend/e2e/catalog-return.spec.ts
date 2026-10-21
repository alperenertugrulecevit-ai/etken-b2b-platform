import { expect, test } from "@playwright/test";

for (const navigation of ["browser", "link"] as const) {
  test(`üründen listeye dönüş filtreleri korur: ${navigation}`, async ({ page }) => {
    await page.goto("/");
    await page.goto("/products?subCategory=" + encodeURIComponent("Çöp Torbası"));
    const search = page.getByPlaceholder("Ürün, marka, kod veya barkod ara...");
    await search.fill("çöp");
    await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("çöp");
    const listing = page.url();
    const product = page.locator('a[href^="/products/"]').first();
    await expect(product).toBeVisible();
    await product.click();
    await expect(page).toHaveURL(/\/products\/[^?]+\?returnTo=/);
    if (navigation === "browser") await page.goBack();
    else await page.getByRole("link", { name: "Ürünlere Dön" }).click();
    await expect.poll(() => new URL(page.url()).searchParams.toString())
      .toBe(new URL(listing).searchParams.toString());
    await expect(search).toHaveValue("çöp");
    await page.reload();
    await expect(search).toHaveValue("çöp");
    await expect(page.getByLabel("Alt Kategori", { exact: true })).toHaveValue("Çöp Torbası");
  });
}

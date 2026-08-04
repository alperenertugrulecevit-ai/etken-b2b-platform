import { expect, test, type Page } from "@playwright/test";

async function prepareEmptyCart(page: Page): Promise<void> {
  await page.goto("/", {
    waitUntil: "domcontentloaded",
  });

  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto("/products", {
    waitUntil: "domcontentloaded",
  });
}

async function openFirstProductDetail(page: Page): Promise<void> {
  const productLink = page
    .locator('a[href^="/products/"]')
    .filter({
      hasNot: page.locator('a[href="/products"]'),
    })
    .first();

  await expect(productLink).toBeVisible();

  await productLink.click();

  await expect(page).toHaveURL(/\/products\/[^/?#]+/);
}

async function addProductFromDetailPage(page: Page): Promise<void> {
  await openFirstProductDetail(page);

  const addToCartButton = page.getByRole("button", {
    name: "Sepete Ekle",
    exact: true,
  });

  await expect(addToCartButton).toBeVisible();
  await expect(addToCartButton).toBeEnabled();

  await addToCartButton.click();

  const cartLink = page.getByRole("link", {
    name: /Sepet/i,
  });

  await expect(cartLink).toBeVisible();

  await expect
    .poll(
      async () => {
        return (await cartLink.textContent())?.trim() ?? "";
      },
      {
        message: "Sepet adedi 1 olarak güncellenmedi.",
        timeout: 20_000,
        intervals: [200, 500, 1_000],
      },
    )
    .toMatch(/Sepet\s*\(1\)/i);
}

test.describe("Sepet kullanıcı akışı", () => {
  test.describe.configure({
    mode: "serial",
  });

  test.beforeEach(async ({ page }) => {
    await prepareEmptyCart(page);
  });

  test("ürün detayından sepete ürün eklenebiliyor", async ({ page }) => {
    await addProductFromDetailPage(page);

    await page
      .getByRole("link", {
        name: /Sepet\s*\(1\)/i,
      })
      .click();

    await expect(page).toHaveURL(/\/cart(?:\?.*)?$/);

    await expect(page.locator("body")).not.toContainText(
      /sepetiniz boş|sepet boş/i,
    );
  });

  test("sepete eklenen ürün sayısı üst menüde güncelleniyor", async ({
    page,
  }) => {
    await addProductFromDetailPage(page);

    await expect(
      page.getByRole("link", {
        name: /Sepet\s*\(1\)/i,
      }),
    ).toBeVisible();
  });
});
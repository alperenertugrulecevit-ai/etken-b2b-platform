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
    waitUntil: "networkidle",
  });
}

async function openFirstProductDetail(page: Page): Promise<void> {
  const productLink = page
    .locator('a[href^="/products/"]')
    .filter({
      hasNot: page.locator('a[href="/products"]'),
    })
    .first();

  await expect(productLink).toBeVisible({
    timeout: 20_000,
  });

  await productLink.click();

  await expect(page).toHaveURL(
    /\/products\/[^/?#]+/,
    {
      timeout: 20_000,
    },
  );

  await page.waitForLoadState("networkidle");
}

async function readCartText(page: Page): Promise<string> {
  const cartLink = page.getByRole("link", {
    name: /Sepet/i,
  });

  await expect(cartLink).toBeVisible({
    timeout: 20_000,
  });

  return (await cartLink.textContent())?.trim() ?? "";
}

async function addProductFromDetailPage(
  page: Page,
): Promise<void> {
  await openFirstProductDetail(page);

  const addToCartButton = page.getByRole("button", {
    name: "Sepete Ekle",
    exact: true,
  });

  await expect(addToCartButton).toBeVisible({
    timeout: 20_000,
  });

  await expect(addToCartButton).toBeEnabled({
    timeout: 20_000,
  });

  /*
   * GitHub Actions ortamında sayfanın görünür olması,
   * React tarafının tamamen hazır olduğu anlamına
   * gelmeyebilir. İlk tıklama boşa giderse ürün ekleme
   * işlemini en fazla üç kez tekrar deneriz.
   */
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await addToCartButton.click();

    try {
      await expect
        .poll(
          async () => readCartText(page),
          {
            message:
              `Sepet adedi ${attempt}. denemeden sonra güncellenmedi.`,
            timeout: 7_000,
            intervals: [250, 500, 1_000],
          },
        )
        .toMatch(/Sepet\s*\([1-9]\d*\)/i);

      return;
    } catch {
      if (attempt === 3) {
        throw new Error(
          "Ürün üç denemeye rağmen sepete eklenemedi.",
        );
      }

      await page.waitForTimeout(1_000);
    }
  }
}

test.describe("Sepet kullanıcı akışı", () => {
  test.describe.configure({
    mode: "serial",
  });

  test.beforeEach(async ({ page }) => {
    await prepareEmptyCart(page);
  });

  test("ürün detayından sepete ürün eklenebiliyor", async ({
    page,
  }) => {
    await addProductFromDetailPage(page);

    const cartLink = page.getByRole("link", {
      name: /Sepet\s*\([1-9]\d*\)/i,
    });

    await expect(cartLink).toBeVisible();

    await cartLink.click();

    await expect(page).toHaveURL(
      /\/cart(?:\?.*)?$/,
    );

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
        name: /Sepet\s*\([1-9]\d*\)/i,
      }),
    ).toBeVisible();
  });
});
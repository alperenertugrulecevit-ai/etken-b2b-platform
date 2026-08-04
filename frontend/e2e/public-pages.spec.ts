import { expect, test, type Page } from "@playwright/test";

type PublicPageDefinition = {
  name: string;
  path: string;
};

const publicPages: PublicPageDefinition[] = [
  {
    name: "Ana sayfa",
    path: "/",
  },
  {
    name: "Ürünler",
    path: "/products",
  },
  {
    name: "Sepet",
    path: "/cart",
  },
  {
    name: "Müşteri girişi",
    path: "/customer-login",
  },
  {
    name: "İletişim",
    path: "/contact",
  },
  {
    name: "B2B satış koşulları",
    path: "/legal/b2b-sales",
  },
  {
    name: "Teslimat ve iade",
    path: "/legal/delivery-returns",
  },
  {
    name: "KVKK",
    path: "/legal/kvkk",
  },
  {
    name: "Gizlilik politikası",
    path: "/legal/privacy",
  },
];

async function expectHealthyPage(page: Page, path: string): Promise<void> {
  const response = await page.goto(path, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  expect(response, `${path} için HTTP yanıtı alınamadı.`).not.toBeNull();

  if (!response) {
    return;
  }

  expect(
    response.status(),
    `${path} beklenmeyen HTTP durum kodu döndürdü.`,
  ).toBeLessThan(400);

  await expect(page.locator("body")).toBeVisible();

  await expect(page.locator("body")).not.toContainText(
    "Application error: a server-side exception has occurred",
  );

  await expect(page.locator("body")).not.toContainText(
    "This page could not be found",
  );
}

test.describe("Herkese açık sayfalar", () => {
  for (const publicPage of publicPages) {
    test(`${publicPage.name} sayfası başarılı açılıyor`, async ({ page }) => {
      await expectHealthyPage(page, publicPage.path);
    });
  }
});

test.describe("Sağlık kontrolü", () => {
  test("/api/health başarılı yanıt veriyor", async ({ request }) => {
    const response = await request.get("/api/health", {
      timeout: 30_000,
    });

    expect(response.status()).toBe(200);

    const contentType = response.headers()["content-type"] ?? "";

    expect(
      contentType.includes("application/json") ||
        contentType.includes("text/plain"),
    ).toBeTruthy();

    expect((await response.body()).length).toBeGreaterThan(0);
  });
});
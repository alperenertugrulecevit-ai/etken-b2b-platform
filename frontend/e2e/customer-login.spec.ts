import { expect, test } from "@playwright/test";

test.describe("Kurumsal müşteri girişi", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/customer-login");
  });

  test("giriş formu doğru alanları gösteriyor", async ({ page }) => {
    await expect(
      page.getByRole("textbox", {
        name: "Kullanıcı Adı",
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("textbox", {
        name: "Şifre",
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: "Kurumsal Hesabıma Giriş Yap",
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("link", {
        name: "Şifremi Unuttum",
      }),
    ).toBeVisible();
  });

  test("boş form gönderildiğinde kullanıcı giriş yapamıyor", async ({
    page,
  }) => {
    await page
      .getByRole("button", {
        name: "Kurumsal Hesabıma Giriş Yap",
      })
      .click();

    await expect(page).toHaveURL(/\/customer-login/);
  });

  test("geçersiz kullanıcı bilgileri reddediliyor", async ({ page }) => {
    await page
      .getByRole("textbox", {
        name: "Kullanıcı Adı",
      })
      .fill("playwright-gecersiz-kullanici");

    await page
      .getByRole("textbox", {
        name: "Şifre",
      })
      .fill("GecersizTestSifresi-2026");

    await page
      .getByRole("button", {
        name: "Kurumsal Hesabıma Giriş Yap",
      })
      .click();

    await expect(page).toHaveURL(/\/customer-login/);

    await expect(page.locator("body")).toContainText(
      /hatalı|geçersiz|bulunamadı|başarısız|giriş yapılamadı/i,
    );
  });

  test("şifremi unuttum bağlantısı açılıyor", async ({ page }) => {
    const forgotPasswordLink = page.getByRole("link", {
      name: "Şifremi Unuttum",
    });

    await expect(forgotPasswordLink).toBeVisible();
    await forgotPasswordLink.click();

    await expect(page).not.toHaveURL(/\/customer-login$/);
  });
});
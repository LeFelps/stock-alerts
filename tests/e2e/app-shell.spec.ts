import { expect, test } from "@playwright/test";

test("shows the public Google sign-in page in pt-BR", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { exact: true, name: "Entrar no painel" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Entrar com Google" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { exact: true, name: "Stock Alerts" }),
  ).toBeVisible();
});

test("redirects signed-out dashboard visitors to sign in", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/(\?callbackUrl=.*)?$/);
  await expect(
    page.getByRole("button", { name: "Entrar com Google" }),
  ).toBeVisible();
});

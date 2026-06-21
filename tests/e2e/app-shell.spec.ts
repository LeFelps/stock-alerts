import { expect, test } from "@playwright/test";

test("shows the desktop dashboard shell in pt-BR", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { exact: true, name: "Painel" }),
  ).toBeVisible();
  await expect(page.getByText("Painel protegido")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Seções do painel" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Abrir navegação" }),
  ).toBeHidden();
  await expect(
    page.getByRole("button", { exact: true, name: "Regras de alerta" }),
  ).toBeVisible();
  await expect(page.getByText("AAPL")).toBeVisible();
});

test("opens the mobile navigation drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(
    page.getByRole("navigation", { name: "Seções do painel" }),
  ).toBeHidden();

  await page.getByRole("button", { name: "Abrir navegação" }).click();

  const navigation = page.getByRole("navigation", {
    name: "Navegação principal",
  });

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(navigation.getByText("Visão geral")).toBeVisible();
  await expect(navigation.getByText("Regras de alerta")).toBeVisible();
  await expect(navigation.getByText("Conta")).toBeVisible();
});

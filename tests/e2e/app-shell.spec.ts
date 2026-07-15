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

test("keeps centered content fixed when vertical overflow appears", async ({
  page,
}) => {
  await page.setViewportSize({ height: 1400, width: 1280 });
  await page.goto("/");

  const positions = await page.evaluate(async () => {
    const centeredContent = document.createElement("div");
    centeredContent.style.cssText =
      "position:absolute;inset-inline:0;top:0;width:600px;height:1px;margin-inline:auto";
    document.body.append(centeredContent);

    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    const before = centeredContent.getBoundingClientRect().left;

    const overflow = document.createElement("div");
    overflow.style.height = "2000px";
    document.body.append(overflow);

    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    const after = centeredContent.getBoundingClientRect().left;

    return {
      after,
      before,
      scrollbarGutter: getComputedStyle(document.documentElement)
        .scrollbarGutter,
    };
  });

  expect(positions.scrollbarGutter).toContain("stable");
  expect(positions.after).toBeCloseTo(positions.before, 5);
});

import { expect, test } from "@playwright/test";

const email = process.env.E2E_CASHIER_EMAIL;
const password = process.env.E2E_CASHIER_PASSWORD;
const productSku = process.env.E2E_PRODUCT_SKU;

test.describe("cashier checkout workflow", () => {
  test.skip(!email || !password || !productSku, "Requires an isolated seeded E2E database and stocked E2E_PRODUCT_SKU.");
  test("opens a session, scans a product, takes payment, views receipt, and closes", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/pos/);

    if (await page.getByRole("heading", { name: "Open POS session" }).isVisible()) {
      await page.getByLabel(/Opening cash/).fill("0.00");
      await page.getByRole("button", { name: "Open session" }).click();
    }
    await page.getByPlaceholder("Search product or scan barcode").fill(productSku!);
    await page.getByPlaceholder("Search product or scan barcode").press("Enter");
    await expect(page.getByText("Current sale")).toBeVisible();
    await page.getByLabel("Payment method").selectOption("CARD");
    await page.getByRole("button", { name: /^Pay / }).click();
    await expect(page.getByText(/Sale .* completed/)).toBeVisible();
    await page.getByRole("link", { name: "View receipt" }).click();
    await expect(page.getByText("Sale receipt")).toBeVisible();

    await page.goto("/pos");
    await page.getByPlaceholder("Actual cash").fill("0.00");
    await page.getByRole("button", { name: "Close session" }).click();
    await expect(page.getByRole("heading", { name: "Open POS session" })).toBeVisible();
  });
});

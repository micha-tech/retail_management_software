import { expect, test } from "@playwright/test";

const email = process.env.E2E_OWNER_EMAIL;
const password = process.env.E2E_OWNER_PASSWORD;

test.describe("owner inventory and transfer workflow", () => {
  test.skip(!email || !password, "Requires an isolated seeded E2E database.");
  test("creates a branch and product, receives stock, then completes a transfer", async ({ page }) => {
    const suffix = Date.now().toString().slice(-7);
    const branchName = `E2E Branch ${suffix}`;
    const branchCode = `E${suffix}`;
    const productName = `E2E Product ${suffix}`;
    const sku = `E2E-${suffix}`;

    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/overview/);

    await page.goto("/branches/new");
    await page.getByLabel("Branch name").fill(branchName);
    await page.getByLabel("Unique code").fill(branchCode);
    await page.getByRole("button", { name: "Create branch" }).click();
    await expect(page.getByText(branchName)).toBeVisible();

    await page.goto("/products/new");
    await page.getByLabel("Name").fill(productName);
    await page.getByLabel("SKU").fill(sku);
    await page.getByLabel("Selling price").fill("500.00");
    await page.getByLabel("Cost price").fill("300.00");
    await page.getByRole("button", { name: "Create product" }).click();
    await expect(page.getByText(productName)).toBeVisible();

    await page.goto("/inventory/receive");
    await page.getByLabel("Branch").selectOption({ label: branchName });
    await page.getByLabel("Product").selectOption({ label: `${productName} · ${sku}` });
    await page.getByLabel("Quantity").fill("10");
    await page.getByLabel("Unit cost").fill("300.00");
    await page.getByRole("button", { name: "Confirm receipt" }).click();
    await expect(page.getByText(productName).first()).toBeVisible();

    await page.goto("/transfers/new");
    await page.getByLabel("Source branch").selectOption({ label: branchName });
    const destination = page.getByLabel("Destination branch");
    const destinationValue = await destination.locator("option").evaluateAll((options, source) => (options as HTMLOptionElement[]).find((option) => option.textContent !== source)?.value || "", branchName);
    expect(destinationValue).not.toBe("");
    await destination.selectOption(destinationValue);
    await page.getByLabel("Product").selectOption({ label: `${productName} · ${sku}` });
    await page.getByLabel("Quantity").fill("2");
    await page.getByRole("button", { name: "Create draft" }).click();
    await page.getByRole("button", { name: "Dispatch" }).first().click();
    await page.getByRole("button", { name: "Receive" }).first().click();
    await expect(page.getByText("RECEIVED").first()).toBeVisible();
  });
});

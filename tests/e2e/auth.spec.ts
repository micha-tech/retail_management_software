import { expect, test } from "@playwright/test";
test("login and onboarding are reachable",async({page})=>{await page.goto("/login");await expect(page.getByRole("heading",{name:"Sign in to your workspace"})).toBeVisible();await page.getByRole("link",{name:"Create a business"}).click();await expect(page.getByRole("heading",{name:"Create your retail workspace"})).toBeVisible();});

import { expect, test } from "@playwright/test";

test.describe("logout", () => {
    test("signs out and can no longer reach a protected page", async ({ page }) => {
        await page.goto("/works/projects");
        await expect(page).not.toHaveURL(/\/login$/);

        await page.getByRole("button", { name: "Log out" }).click();
        await page.waitForURL(/\/login$/);

        await page.goto("/works/projects");
        await expect(page).toHaveURL(/\/login$/);
    });
});

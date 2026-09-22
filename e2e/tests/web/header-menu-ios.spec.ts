import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }, testInfo) => {
    await context.addCookies([
        {
            name: "site-preloader",
            value: "1",
            url: String(testInfo.project.use.baseURL),
        },
    ]);
});

test("the first iOS tap keeps the menu open after navigation", async ({ page }) => {
    await page.goto("/en");

    await page.getByRole("button", { name: "Open menu" }).tap();
    const mobileNav = page.getByRole("navigation", { name: "Mobile navigation" });
    await mobileNav.getByRole("link", { name: /works/i }).tap();
    await expect(page).toHaveURL(/\/en\/works$/);

    const trigger = page.locator('button[aria-haspopup="true"]');
    await trigger.tap();

    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(mobileNav).toBeVisible();
    await page.waitForTimeout(1_000);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(mobileNav).toBeVisible();

    await page.getByRole("button", { name: "Close menu" }).tap();
    await expect(mobileNav).not.toBeVisible();
});

import { expect, test } from "@playwright/test";

for (const [theme, expected] of [
    ["light", { background: "rgb(255, 255, 255)", color: "rgb(0, 0, 0)" }],
    ["dark", { background: "rgb(0, 0, 0)", color: "rgb(255, 255, 255)" }],
] as const) {
    test(`route loader follows the ${theme} theme`, async ({ page, context }, testInfo) => {
        const url = String(testInfo.project.use.baseURL);
        await context.addCookies([
            { name: "site-preloader", value: "1", url },
            { name: "site-theme", value: theme, url },
        ]);
        await context.addInitScript((value) => {
            localStorage.setItem("site-theme", value);
        }, theme);
        await page.goto("/en");
        await page.waitForTimeout(1500);
        await page.route(/\/en\/contact/, async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 3000));
            await route.continue();
        });
        await page
            .locator('header a[href="/en/contact"]')
            .first()
            .evaluate((link: HTMLAnchorElement) => link.click());
        const loader = page.locator('[class*="routeOverlay"]');
        await expect(loader).toBeVisible();
        await expect(loader).toHaveCSS("background-color", expected.background);
        await expect(loader).toHaveCSS("color", expected.color);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    });
}

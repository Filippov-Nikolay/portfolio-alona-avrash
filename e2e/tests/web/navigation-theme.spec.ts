import { expect, test } from "../../fixtures/test";

for (const theme of ["light", "dark"] as const) {
    test(`client navigation keeps the ${theme} theme without a route loader`, async ({
        page,
        context,
    }, testInfo) => {
        const url = String(testInfo.project.use.baseURL);
        await context.addCookies([
            { name: "site-preloader", value: "1", url },
            { name: "site-theme", value: theme, url },
        ]);
        await context.addInitScript((value) => {
            localStorage.setItem("site-theme", value);
        }, theme);
        await page.goto("/en");
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await page.waitForTimeout(1500);

        const loader = page.locator('[class*="routeOverlay"]');
        let loaderShown = false;
        await page.exposeFunction("reportRouteLoader", () => {
            loaderShown = true;
        });
        await page.evaluate(() => {
            new MutationObserver(() => {
                if (document.querySelector('[class*="routeOverlay"]')) {
                    (window as unknown as { reportRouteLoader: () => void }).reportRouteLoader();
                }
            }).observe(document.body, { childList: true, subtree: true });
        });

        await page
            .locator('header a[href="/en/contact"]')
            .first()
            .evaluate((link: HTMLAnchorElement) => link.click());
        await page.waitForURL("**/en/contact");
        await expect(page.getByRole("button", { name: "Send message" })).toBeVisible();

        expect(loaderShown).toBe(false);
        await expect(loader).toHaveCount(0);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    });
}

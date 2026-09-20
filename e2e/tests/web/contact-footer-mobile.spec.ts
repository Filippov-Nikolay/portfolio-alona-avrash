import { expect, test } from "@playwright/test";

test("contact footer keeps its background intact and reveals once on mobile", async ({
    page,
}, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.context().addCookies([
        {
            name: "site-preloader",
            value: "1",
            url: String(testInfo.project.use.baseURL),
        },
    ]);
    await page.goto("/en/contact");

    const footer = page.locator("[data-site-footer]");
    const left = footer.locator("[data-footer-left]");
    const right = footer.locator("[data-footer-right]");
    const brand = footer.locator("[data-footer-brand]");

    await expect(footer).toHaveCSS("clip-path", "none");
    await expect(footer).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(left).toHaveCSS("opacity", "0");

    await footer.scrollIntoViewIfNeeded();
    await expect(left).toHaveCSS("opacity", "1");
    await expect(right).toHaveCSS("opacity", "1");
    await expect(brand).toHaveCSS("opacity", "1");

    await page.evaluate("window.scrollTo(0, 0)");
    await page.waitForTimeout(150);
    await footer.scrollIntoViewIfNeeded();
    await expect(left).toHaveCSS("opacity", "1");
});

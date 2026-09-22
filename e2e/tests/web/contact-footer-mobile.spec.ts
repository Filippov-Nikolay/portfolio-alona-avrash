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
    const curtain = footer.locator("[data-footer-curtain]");
    const left = footer.locator("[data-footer-left]");
    const right = footer.locator("[data-footer-right]");
    const brand = footer.locator("[data-footer-brand]");

    await expect(footer).toHaveCSS("clip-path", "none");
    await expect(footer).toHaveCSS("background-color", "rgb(234, 253, 39)");
    await expect(curtain).toHaveCSS("background-color", "rgb(234, 253, 39)");
    await expect(left.locator("[data-footer-mask]")).not.toHaveCSS("transform", "none");
    await expect(left.locator("[data-footer-social-item]").first()).toHaveCSS("opacity", "0");

    await page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)");
    await expect(left).toHaveCSS("opacity", "1");
    await expect(right).toHaveCSS("opacity", "1");
    await expect(brand).toHaveCSS("opacity", "1");
    const brandChars = brand.locator("[data-footer-char]");
    await expect(brandChars.first()).toHaveCSS("opacity", "1");
    await expect(brandChars.first()).toHaveCSS("transform", "none");
    await expect(brandChars.last()).toHaveCSS("transform", "none");
    await expect(left.locator("[data-footer-mask]").first()).toHaveCSS("transform", "none");
    await expect(right.locator("[data-footer-mask]").first()).toHaveCSS("transform", "none");
    await expect(curtain).toHaveCSS("visibility", "hidden");

    await page.evaluate("window.scrollTo(0, 0)");
    await page.waitForTimeout(150);
    await footer.scrollIntoViewIfNeeded();
    await expect(left).toHaveCSS("opacity", "1");
    await expect(brandChars.first()).toHaveCSS("transform", "none");
});

test("contact footer stays visible with reduced motion", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.context().addCookies([
        {
            name: "site-preloader",
            value: "1",
            url: String(testInfo.project.use.baseURL),
        },
    ]);
    await page.goto("/en/contact");

    const footer = page.locator("[data-site-footer]");
    await expect(footer.locator("[data-footer-curtain]")).toBeHidden();
    await expect(footer.locator("[data-footer-left]")).toHaveCSS("opacity", "1");
    await expect(footer.locator("[data-footer-brand]")).toHaveCSS("opacity", "1");
});

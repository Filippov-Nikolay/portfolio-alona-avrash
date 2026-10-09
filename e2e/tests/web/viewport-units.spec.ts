import { expect, test } from "../../fixtures/test";

test.beforeEach(async ({ context }, testInfo) => {
    await context.addCookies([
        { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
    ]);
});

const readLayout = (page: import("@playwright/test").Page) =>
    page.evaluate(() => {
        const root = document.documentElement;
        const runway =
            document.querySelector<HTMLElement>("#projects [data-phase]")!.parentElement!;
        return {
            svh: root.style.getPropertyValue("--svh"),
            lvh: root.style.getPropertyValue("--lvh"),
            documentHeight: root.scrollHeight,
            runway: runway.offsetHeight,
        };
    });

test("desktop browsers keep native viewport units", async ({ page, hasTouch }) => {
    test.skip(hasTouch, "Desktop only");
    await page.goto("/en");
    await expect(page.locator("#projects [data-phase]")).toBeAttached();

    const layout = await readLayout(page);
    expect(layout.svh).toBe("");
    expect(layout.lvh).toBe("");
});

test("a touch browser whose svh follows its toolbars keeps the page length", async ({
    page,
    hasTouch,
}) => {
    test.skip(!hasTouch, "Touch only");
    await page.setViewportSize({ width: 390, height: 664 });
    await page.goto("/en");
    await expect(page.locator("#projects [data-phase]")).toBeAttached();
    await page.waitForTimeout(500);

    // The emulated viewport has no browser chrome, so svh equals lvh, as in
    // an in-app WKWebView without viewport insets.
    const before = await readLayout(page);
    expect(before.svh).toBe("6.64px");
    expect(before.lvh).toBe("6.64px");

    await page.setViewportSize({ width: 390, height: 740 });
    await page.waitForTimeout(300);
    const toolbarsHidden = await readLayout(page);
    expect(toolbarsHidden).toEqual(before);

    await page.setViewportSize({ width: 430, height: 740 });
    await page.waitForTimeout(300);
    const rotated = await readLayout(page);
    expect(rotated.svh).toBe("7.4px");
    expect(rotated.runway).toBeGreaterThan(before.runway);
});

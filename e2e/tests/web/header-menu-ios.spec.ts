import { expect, test } from "../../fixtures/test";

test.beforeEach(async ({ context }, testInfo) => {
    await context.addCookies([
        {
            name: "site-preloader",
            value: "1",
            url: String(testInfo.project.use.baseURL),
        },
    ]);
});

test("the first iOS tap keeps the menu open after navigation", async ({ page, hasTouch }) => {
    test.skip(!hasTouch, "drives the menu with touch taps");
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

test("touch header pills keep their own layers without moving the menu panel", async ({
    page,
    hasTouch,
}) => {
    test.skip(!hasTouch, "iOS relayouts fixed elements on every scroll frame");
    await page.goto("/en");
    const pills = await page.evaluate(() =>
        Array.from(document.querySelector("header")!.firstElementChild!.children)
            .filter((pill) => getComputedStyle(pill).display !== "none")
            .map((pill) => getComputedStyle(pill).willChange)
    );
    expect(pills.length).toBeGreaterThan(0);
    expect(pills.every((willChange) => willChange === "transform")).toBe(true);

    await page.getByRole("button", { name: "Open menu" }).tap();
    const panel = page.locator("[data-menu-panel]");
    await expect(panel).toBeVisible();
    await expect
        .poll(() =>
            page.evaluate(() => {
                const header = document.querySelector("header")!.getBoundingClientRect();
                const menu = document.querySelector("[data-menu-panel]")!.getBoundingClientRect();
                return Math.round((menu.top - header.bottom) * 100) / 100;
            })
        )
        .toBe(0);
});

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

test("Services stays anchored during an iOS-style height-only resize", async ({ page }) => {
    await page.goto("/en");

    const cards = page.locator("#services article");
    await expect(cards.nth(1)).toBeAttached();
    await page.waitForTimeout(800);

    const serviceScroll = await page.locator("#services").evaluate((section) => {
        const view = section.ownerDocument.defaultView!;
        return section.getBoundingClientRect().top + view.scrollY + view.innerHeight * 0.9;
    });

    await page
        .locator("html")
        .evaluate(
            (root, scrollY) => root.ownerDocument.defaultView!.scrollTo(0, scrollY),
            serviceScroll
        );
    await page.waitForTimeout(700);

    const before = await cards.first().evaluate((card) => {
        const view = card.ownerDocument.defaultView!;

        return {
            scrollY: view.scrollY,
            opacity: Number.parseFloat(card.style.opacity || "1"),
        };
    });

    await cards.first().evaluate((card) => {
        const view = card.ownerDocument.defaultView!;
        const originalHeight = view.innerHeight;
        Object.defineProperty(view, "innerHeight", {
            configurable: true,
            value: originalHeight + 86,
        });
        view.dispatchEvent(new Event("resize"));
        card.ownerDocument.body.style.paddingBottom = "12px";
    });
    await page.waitForTimeout(500);

    const after = await cards.first().evaluate((card) => {
        const view = card.ownerDocument.defaultView!;

        return {
            scrollY: view.scrollY,
            opacity: Number.parseFloat(card.style.opacity || "1"),
            transform: card.style.transform,
        };
    });

    expect(Math.abs(after.scrollY - before.scrollY)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.opacity - before.opacity)).toBeLessThan(0.05);
    expect(after.transform.length).toBeGreaterThan(0);
});

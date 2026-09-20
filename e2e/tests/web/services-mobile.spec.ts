import { expect, test } from "@playwright/test";

test("mobile Services reveal stays progressive during a fast scroll", async ({
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
    await page.goto("/en");

    const cards = page.locator("#services article");
    await expect(cards.nth(1)).toBeAttached();
    await page.waitForTimeout(500);

    const revealStart = await cards.nth(1).evaluate((card) => {
        const view = card.ownerDocument.defaultView!;
        const runway = card.previousElementSibling!;
        const flowTop = runway.getBoundingClientRect().bottom + view.scrollY;
        const stickyTop = Number.parseFloat(view.getComputedStyle(card).top);

        return flowTop - stickyTop - 180;
    });

    await cards
        .nth(1)
        .evaluate(
            (card, scrollY) => card.ownerDocument.defaultView!.scrollTo(0, scrollY - 12),
            revealStart
        );
    await page.waitForTimeout(700);

    await cards.nth(1).evaluate(async (card, scrollY) => {
        const view = card.ownerDocument.defaultView!;

        for (let step = 1; step <= 8; step += 1) {
            view.scrollTo(0, scrollY - 12 + step * 55);
            await new Promise<void>((resolve) => view.requestAnimationFrame(() => resolve()));
        }
    }, revealStart);

    const opacityDuringFlick = Number.parseFloat(
        await cards.nth(1).evaluate((card) => card.style.opacity)
    );
    expect(opacityDuringFlick).toBeGreaterThan(0);
    expect(opacityDuringFlick).toBeLessThan(0.9);

    await expect
        .poll(async () =>
            Number.parseFloat(await cards.nth(1).evaluate((card) => card.style.opacity))
        )
        .toBeGreaterThan(0.98);
});

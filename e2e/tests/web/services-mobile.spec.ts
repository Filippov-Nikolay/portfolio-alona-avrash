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
    const secondSoftener = cards.nth(1).locator("[data-service-softener]");
    await expect(cards.nth(1)).toBeAttached();
    await expect(cards.first()).toHaveCSS("filter", "none");
    await expect(cards.first()).toHaveCSS("will-change", "auto");
    await expect(secondSoftener).toBeHidden();
    await expect(secondSoftener).toHaveCSS("backdrop-filter", "none");
    await page.waitForTimeout(1_200);

    const revealStart = await cards.nth(1).evaluate((card) => {
        const view = card.ownerDocument.defaultView!;
        const runway = card.previousElementSibling!;
        const flowTop = runway.getBoundingClientRect().bottom + view.scrollY;
        const stickyTop = Number.parseFloat(view.getComputedStyle(card).top);

        return flowTop - stickyTop - 180;
    });

    const maxLayersDuringSlowScroll = await cards.nth(1).evaluate(async (card, scrollY) => {
        const view = card.ownerDocument.defaultView!;
        const animatedCards = Array.from(card.parentElement!.querySelectorAll("article"));
        const targetScroll = scrollY - 12;
        const startScroll = Math.max(0, targetScroll - view.innerHeight * 0.65);
        let maxActiveLayers = 0;

        for (let position = startScroll; position < targetScroll; position += 6) {
            view.scrollTo(0, Math.min(position, targetScroll));
            view.dispatchEvent(new Event("scroll"));
            await new Promise<void>((resolve) => view.requestAnimationFrame(() => resolve()));
            maxActiveLayers = Math.max(
                maxActiveLayers,
                animatedCards.filter(
                    (animatedCard) => view.getComputedStyle(animatedCard).willChange !== "auto"
                ).length
            );
        }

        view.scrollTo(0, targetScroll);
        view.dispatchEvent(new Event("scroll"));
        return maxActiveLayers;
    }, revealStart);
    expect(maxLayersDuringSlowScroll).toBeLessThanOrEqual(3);
    await expect
        .poll(async () =>
            Number.parseFloat(await cards.first().evaluate((card) => card.style.opacity))
        )
        .toBeGreaterThan(0.98);

    await cards.nth(1).evaluate(async (card, scrollY) => {
        const view = card.ownerDocument.defaultView!;

        for (let step = 1; step <= 8; step += 1) {
            view.scrollTo(0, scrollY - 12 + step * 55);
            view.dispatchEvent(new Event("scroll"));
            await new Promise<void>((resolve) => view.requestAnimationFrame(() => resolve()));
        }
    }, revealStart);
    await page.waitForTimeout(50);

    const opacityDuringFlick = Number.parseFloat(
        await cards.nth(1).evaluate((card) => card.style.opacity)
    );
    expect(opacityDuringFlick).toBeGreaterThan(0);
    expect(opacityDuringFlick).toBeLessThan(0.9);
    await expect(secondSoftener).toBeVisible();

    await expect
        .poll(async () =>
            Number.parseFloat(await cards.nth(1).evaluate((card) => card.style.opacity))
        )
        .toBeGreaterThan(0.98);
    await expect(secondSoftener).toBeHidden();

    await expect(cards.nth(1)).toHaveCSS("filter", "none");
    await expect(cards.nth(1)).toHaveCSS("will-change", "transform, opacity");

    await page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)");
    await expect(cards.nth(1)).toHaveCSS("will-change", "auto");
});

test("mobile Services follows a slow scroll directly after the second card", async ({
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
    await page.waitForTimeout(1_200);

    const thirdCard = page.locator("#services article").nth(2);
    const result = await thirdCard.evaluate(async (card) => {
        const view = card.ownerDocument.defaultView!;
        const runway = card.previousElementSibling!;
        const revealDistance = 180;
        const revealStart =
            runway.getBoundingClientRect().bottom +
            view.scrollY -
            Number.parseFloat(view.getComputedStyle(card).top) -
            revealDistance;
        const targetProgress = 0.4;
        const targetScroll = revealStart + revealDistance * targetProgress;
        const startScroll = targetScroll - 72;

        view.scrollTo(0, startScroll);
        view.dispatchEvent(new Event("scroll"));
        await new Promise<void>((resolve) => view.requestAnimationFrame(() => resolve()));

        for (let position = startScroll + 6; position <= targetScroll; position += 6) {
            view.scrollTo(0, position);
            view.dispatchEvent(new Event("scroll"));
            await new Promise<void>((resolve) => view.requestAnimationFrame(() => resolve()));
        }

        const expectedOpacity = targetProgress * targetProgress * (3 - 2 * targetProgress);
        return {
            actualOpacity: Number.parseFloat(card.style.opacity),
            expectedOpacity,
        };
    });

    expect(Math.abs(result.actualOpacity - result.expectedOpacity)).toBeLessThan(0.02);
});

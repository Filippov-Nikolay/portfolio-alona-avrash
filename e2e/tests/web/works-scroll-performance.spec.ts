import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context, hasTouch }, testInfo) => {
    test.skip(!hasTouch, "requires a touch-capable browser context");

    await context.addCookies([
        {
            name: "site-preloader",
            value: "1",
            url: String(testInfo.project.use.baseURL),
        },
    ]);
});

test("Works only composites nearby cards while preserving the scroll reveal", async ({ page }) => {
    await page.goto("/en/works");

    const cards = page.getByTestId("works-card");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(1);

    const target = cards.nth(1);
    const initialState = await target.evaluate((element) => {
        const style = element.ownerDocument.defaultView!.getComputedStyle(element);
        return {
            reveal: element.hasAttribute("data-works-reveal"),
            settled: element.hasAttribute("data-works-reveal-settled"),
            filter: style.filter,
            transform: style.transform,
        };
    });
    expect(initialState.reveal).toBe(true);
    expect(initialState.settled).toBe(false);
    expect(initialState.filter).not.toBe("none");
    expect(initialState.transform).not.toBe("none");

    const placeCardTopAt = async (viewportRatio: number) => {
        await target.evaluate((element, ratio) => {
            const view = element.ownerDocument.defaultView!;
            const absoluteTop = element.getBoundingClientRect().top + view.scrollY;
            view.scrollTo(0, absoluteTop - view.innerHeight * ratio);
        }, viewportRatio);
        await page.waitForTimeout(200);
    };

    await placeCardTopAt(1.01);
    const filterBeforeEntry = await target.evaluate(
        (element) => element.ownerDocument.defaultView!.getComputedStyle(element).filter
    );
    await placeCardTopAt(0.99);
    const filterAfterEntry = await target.evaluate(
        (element) => element.ownerDocument.defaultView!.getComputedStyle(element).filter
    );
    expect(filterBeforeEntry).not.toBe("none");
    expect(filterAfterEntry).not.toBe("none");

    await placeCardTopAt(0.75);
    await placeCardTopAt(0.75);

    await expect
        .poll(() =>
            target.evaluate((element) => Number(element.style.getPropertyValue("--reveal")))
        )
        .toBeGreaterThan(0.2);
    await expect
        .poll(() =>
            target.evaluate((element) => Number(element.style.getPropertyValue("--reveal")))
        )
        .toBeLessThan(0.8);

    const revealingState = await target.evaluate((element) => {
        const style = element.ownerDocument.defaultView!.getComputedStyle(element);
        return {
            active: element.hasAttribute("data-works-reveal-active"),
            filter: style.filter,
            transform: style.transform,
            willChange: style.willChange,
        };
    });
    expect(revealingState.active).toBe(true);
    expect(revealingState.filter).not.toBe("none");
    expect(revealingState.transform).not.toBe("none");
    expect(revealingState.willChange).toContain("filter");

    const activeCardCount = await cards.evaluateAll(
        (elements) =>
            elements.filter((element) => element.hasAttribute("data-works-reveal-active")).length
    );
    expect(activeCardCount).toBeLessThanOrEqual(2);

    await placeCardTopAt(0.35);
    await expect
        .poll(() =>
            target.evaluate((element) => Number(element.style.getPropertyValue("--reveal")))
        )
        .toBeGreaterThan(0.999);

    const settledState = await target.evaluate((element) => {
        const style = element.ownerDocument.defaultView!.getComputedStyle(element);
        return {
            active: element.hasAttribute("data-works-reveal-active"),
            filter: style.filter,
            willChange: style.willChange,
        };
    });
    expect(settledState).toEqual({ active: false, filter: "none", willChange: "auto" });

    await placeCardTopAt(0.75);
    await expect
        .poll(() => target.evaluate((element) => element.hasAttribute("data-works-reveal-active")))
        .toBe(true);
});

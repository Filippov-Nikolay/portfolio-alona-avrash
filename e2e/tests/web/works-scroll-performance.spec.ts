import { expect, test, type Locator, type Page } from "../../fixtures/test";

declare global {
    interface Window {
        worksMeasurements: number;
    }
}

test.beforeEach(async ({ context, page }, testInfo) => {
    await context.addCookies([
        { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
    ]);
    await page.addInitScript(() => {
        window.worksMeasurements = 0;
        const isCard = (element: Element) => element.matches('[data-testid="works-card"]');
        const measure = Element.prototype.getBoundingClientRect;
        Element.prototype.getBoundingClientRect = function () {
            if (isCard(this)) window.worksMeasurements++;
            return measure.call(this);
        };
        for (const property of ["offsetTop", "offsetParent", "offsetHeight", "offsetWidth"]) {
            const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, property)!;
            Object.defineProperty(HTMLElement.prototype, property, {
                ...descriptor,
                get() {
                    if (isCard(this)) window.worksMeasurements++;
                    return descriptor.get!.call(this);
                },
            });
        }
    });
});

async function waitForEntrances(page: Page) {
    const cards = page.getByTestId("works-card");
    await expect(cards.first()).toBeVisible();
    // Wait for hydration, fonts and the original staggered page entrance.
    await page.evaluate(() => document.fonts.ready);
    await expect
        .poll(() => cards.nth(1).evaluate((card) => card.style.getPropertyValue("--reveal")))
        .not.toBe("");
    await expect
        .poll(
            () =>
                cards.evaluateAll((elements) =>
                    elements.every((card) => getComputedStyle(card.parentElement!).opacity === "1")
                ),
            { timeout: 10_000 }
        )
        .toBe(true);
}

async function pose(card: Locator) {
    return card.evaluate((element) => {
        const style = getComputedStyle(element);
        const transform = new DOMMatrixReadOnly(style.transform);
        return {
            progress: Number(style.getPropertyValue("--reveal")),
            scale: transform.m11,
            y: transform.m42,
            blur: style.filter === "none" ? 0 : parseFloat(style.filter.slice(5)),
            filter: style.filter,
            opacity: style.opacity,
            active: element.hasAttribute("data-works-reveal-active"),
            settled: element.hasAttribute("data-works-reveal-settled"),
            willChange: style.willChange,
        };
    });
}

async function scrubTo(card: Locator, ratio: number) {
    await card.evaluate((element, ratio) => {
        const top = element.parentElement!.getBoundingClientRect().top + scrollY;
        scrollTo(0, top - innerHeight * ratio);
    }, ratio);
    const t = Math.max(0, Math.min(1, (1 - ratio) / 0.5));
    const progress = t * t * (3 - 2 * t);
    await expect(async () => {
        const state = await pose(card);
        // Layout offsets and scrollTo round to CSS pixels; WebKit can differ
        // by 1–2px after reordering. Check the scroll position within 1% and
        // the original visual ranges against the actual sampled progress.
        expect(Math.abs(state.progress - progress)).toBeLessThan(0.01);
        expect(state.scale).toBeCloseTo(0.9 + state.progress * 0.1, 3);
        expect(state.y).toBeCloseTo((1 - state.progress) * 24, 0);
        expect(state.blur).toBeCloseTo((1 - state.progress) * 9, 1);
        expect(state.opacity).toBe("1");
        if (progress === 1) expect(state.filter).toBe("none");
    }).toPass();
    return pose(card);
}

test("Works keeps the original scroll-linked scale, rise and blur in both directions", async ({
    page,
}, testInfo) => {
    await page.goto("/en/works");
    await waitForEntrances(page);
    const cards = page.getByTestId("works-card");
    await expect(cards.first()).not.toHaveAttribute("data-works-reveal");
    const target = cards.nth(2);
    const frames = [];
    for (const ratio of [1.04, 0.875, 0.75, 0.625, 0.45]) {
        frames.push(await scrubTo(target, ratio));
    }
    expect(frames[0].scale).toBe(0.9);
    expect(frames[0].blur).toBe(9);
    expect(frames[2].active).toBe(true);
    expect(frames[2].willChange).toContain("filter");
    expect(frames[4].settled).toBe(true);
    expect(frames[4].filter).toBe("none");
    expect(frames[4].willChange).toBe("auto");
    const reversed = await scrubTo(target, 0.75);
    expect(reversed.progress).toBeCloseTo(frames[2].progress, 3);
    expect(reversed.active).toBe(true);
    // A stationary scroll position must hold its pose, not run a timed fade.
    await page.waitForTimeout(600);
    expect((await pose(target)).progress).toBe(reversed.progress);
    await testInfo.attach("works-scroll-poses", {
        body: JSON.stringify({ frames, reversed }, null, 2),
        contentType: "application/json",
    });
});

test("Works does not remeasure cards during scrolling or drift when the iOS toolbar resizes", async ({
    page,
    hasTouch,
}, testInfo) => {
    await page.goto("/en/works");
    await waitForEntrances(page);
    const target = page.getByTestId("works-card").nth(2);
    await scrubTo(target, 0.75);
    const measurements = await page.evaluate(async () => {
        window.worksMeasurements = 0;
        const start = scrollY;
        for (let i = 0; i < 40; i++) {
            scrollTo(0, start + i * 2);
            await new Promise(requestAnimationFrame);
        }
        await new Promise(requestAnimationFrame);
        return window.worksMeasurements;
    });
    expect(measurements).toBe(0);
    await testInfo.attach("works-scroll-layout-reads", {
        body: JSON.stringify({ frames: 40, measurements }),
        contentType: "application/json",
    });
    await expect(page.locator("[data-works-reveal-active]")).toHaveCount(1);
    if (hasTouch) {
        const before = await scrubTo(target, 0.75);
        const viewport = page.viewportSize()!;
        await page.setViewportSize({ width: viewport.width, height: viewport.height - 80 });
        await page.waitForTimeout(200);
        expect((await pose(target)).progress).toBeCloseTo(before.progress, 3);
    }
});

test("Works updates cached positions after sorting, filtering and resizing", async ({ page }) => {
    await page.goto("/en/works");
    await waitForEntrances(page);
    await page.getByRole("button", { name: "Latest", exact: true }).click();
    await page.getByRole("option").nth(1).click();
    await expect(page).toHaveURL(/sort=oldest/);
    await waitForEntrances(page);
    await scrubTo(page.getByTestId("works-card").nth(2), 0.75);
    await page.getByRole("radio", { name: "Branding", exact: true }).click();
    await expect(page).toHaveURL(/filter=branding/);
    await waitForEntrances(page);
    const target = page.getByTestId("works-card").nth(1);
    await scrubTo(target, 0.75);
    const viewport = page.viewportSize()!;
    await page.setViewportSize({ width: viewport.width + 60, height: viewport.height });
    await scrubTo(target, 0.625);
});

test("Works honours reduced motion even when it changes mid-reveal", async ({ page }) => {
    await page.goto("/en/works");
    await waitForEntrances(page);
    const target = page.getByTestId("works-card").nth(2);
    await scrubTo(target, 0.75);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(target).toHaveCSS("filter", "none");
    await expect(target).toHaveCSS("transform", "none");
    await expect(target).toHaveCSS("will-change", "auto");
    await expect(page.locator("[data-works-reveal-active]")).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await scrubTo(target, 0.75);
});

import { expect, test } from "@playwright/test";

declare global {
    interface Window {
        worksEntrances: Animation[];
        worksMeasurements: number;
    }
}

test.beforeEach(async ({ context, hasTouch, page }, testInfo) => {
    test.skip(!hasTouch, "requires a touch-capable browser context");
    await context.addCookies([
        { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
    ]);
    await page.addInitScript(() => {
        window.worksEntrances = [];
        window.worksMeasurements = 0;
        const measure = Element.prototype.getBoundingClientRect;
        Element.prototype.getBoundingClientRect = function () {
            if (this.matches('[data-works-reveal], [data-testid="works-card"]'))
                window.worksMeasurements++;
            return measure.call(this);
        };
        document.addEventListener("animationstart", (event) => {
            const target = event.target as HTMLElement;
            if (target.dataset.worksReveal !== "entering") return;
            const animation = target.getAnimations()[0];
            animation.pause();
            window.worksEntrances.push(animation);
        });
    });
});

test("Works entrances keep a constant size and finish independently of scrolling", async ({
    page,
}, testInfo) => {
    await page.goto("/en/works");
    const cards = page.getByTestId("works-card");
    await expect(cards.first()).toBeVisible();
    const target = cards.nth(1);
    const wrapper = target.locator("..");
    await expect(wrapper).toHaveAttribute("data-works-reveal", "pending");
    const top = await wrapper.evaluate((element) => element.getBoundingClientRect().top + scrollY);
    await page.evaluate((top) => scrollTo(0, top - innerHeight * 0.8), top);
    await expect(wrapper).toHaveAttribute("data-works-reveal", "entering");
    await expect.poll(() => page.evaluate(() => window.worksEntrances.length)).toBeGreaterThan(0);

    const frames = [];
    for (const time of [0, 90, 240, 479]) {
        await wrapper.evaluate((element, time) => {
            element.getAnimations()[0].currentTime = time;
        }, time);
        const frame = await target.evaluate((element) => {
            const wrapper = element.parentElement!;
            const style = getComputedStyle(wrapper);
            const matrix = new DOMMatrixReadOnly(style.transform);
            return {
                opacity: Number(style.opacity),
                y: matrix.m42,
                scale: [matrix.m11, matrix.m22],
                width: element.getBoundingClientRect().width,
                filter: getComputedStyle(element).filter,
                wrapperFilter: style.filter,
                willChange: style.willChange,
            };
        });
        frames.push(frame);
        expect(frame.scale).toEqual([1, 1]);
        expect(frame.filter).toBe("none");
        expect(frame.wrapperFilter).toBe("none");
        expect(frame.willChange).not.toContain("filter");
        expect(frame.width).toBeCloseTo(frames[0].width, 2);
    }
    for (let i = 1; i < frames.length; i++) {
        expect(frames[i].opacity).toBeGreaterThan(frames[i - 1].opacity);
        expect(frames[i].y).toBeLessThan(frames[i - 1].y);
    }
    await testInfo.attach("works-entrance-frames", {
        body: JSON.stringify(frames, null, 2),
        contentType: "application/json",
    });
    // Rewind and let the animation run while scroll stays still. A scroll-
    // scrubbed reveal would remain half-finished indefinitely at this position.
    await wrapper.evaluate((element) => {
        const animation = element.getAnimations()[0];
        animation.currentTime = 180;
        animation.play();
    });
    await expect(wrapper).toHaveAttribute("data-works-reveal", "visible");
    await expect(wrapper).toHaveCSS("opacity", "1");
    await expect(wrapper).toHaveCSS("transform", "none");
    await expect(wrapper).toHaveCSS("will-change", "auto");

    // Reverse direction and mimic the iOS address bar resizing the viewport.
    // Already seen cards must not shrink, blur, or restart their entrance.
    const entranceCount = await page.evaluate(() => window.worksEntrances.length);
    await page.evaluate(() => scrollTo(0, 0));
    const viewport = page.viewportSize()!;
    await page.setViewportSize({ width: viewport.width, height: viewport.height - 80 });
    await page.evaluate((top) => scrollTo(0, top - innerHeight * 0.8), top);
    await expect(wrapper).toHaveAttribute("data-works-reveal", "visible");
    expect(await page.evaluate(() => window.worksEntrances.length)).toBe(entranceCount);

    const measurements = await page.evaluate(async () => {
        window.worksMeasurements = 0;
        const start = scrollY;
        for (let i = 0; i < 20; i++) {
            scrollTo(0, start + (i % 2 ? 8 : 0));
            await new Promise(requestAnimationFrame);
        }
        return window.worksMeasurements;
    });
    expect(measurements).toBe(0);
});

test("Works reveals later cards in order and honours reduced motion during an entrance", async ({
    page,
}) => {
    await page.goto("/en/works");
    const cards = page.getByTestId("works-card");
    for (const index of [1, 2]) {
        const wrapper = cards.nth(index).locator("..");
        await expect(wrapper).toHaveAttribute("data-works-reveal", "pending");
        await wrapper.evaluate((element) =>
            scrollTo(0, element.getBoundingClientRect().top + scrollY - innerHeight * 0.8)
        );
        await expect(wrapper).toHaveAttribute("data-works-reveal", "entering");
        await expect
            .poll(() => wrapper.evaluate((element) => element.getAnimations()[0]?.playState))
            .toBe("paused");
        expect(
            await wrapper.evaluate(
                (element) => element.getAnimations()[0].effect!.getTiming().delay
            )
        ).toBeLessThanOrEqual(210);
        if (index === 1) {
            await wrapper.evaluate((element) => element.getAnimations()[0].finish());
            await expect(wrapper).toHaveAttribute("data-works-reveal", "visible");
        }
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(
        page.locator('[data-works-reveal="pending"], [data-works-reveal="entering"]')
    ).toHaveCount(0);
    const states = await cards.evaluateAll((elements) =>
        elements.map((card) => {
            const wrapper = card.parentElement!;
            const style = getComputedStyle(wrapper);
            return {
                opacity: style.opacity,
                transform: style.transform,
                animations: wrapper.getAnimations().length,
            };
        })
    );
    expect(
        states.every(
            (state) => state.opacity === "1" && state.transform === "none" && state.animations === 0
        )
    ).toBe(true);
});

import { expect, test } from "../../fixtures/test";

test("Selected Work stays below Stats throughout entry, reversal and the sticky exit", async ({
    page,
    context,
    hasTouch,
}, testInfo) => {
    test.setTimeout(120_000);
    await context.addCookies([
        { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
    ]);
    const sizes = hasTouch
        ? [
              [390, 664],
              [402, 714],
              [375, 600],
              [844, 390],
          ]
        : [[1280, 720]];
    for (const [width, height] of sizes) {
        await page.setViewportSize({ width, height });
        await page.goto("/en");
        const camera = page.locator('[class*="statsDepthPlane"]');
        await expect
            .poll(() => camera.evaluate((element) => element.getAnimations()[0]?.playState))
            .toBe("paused");
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(1300);
        const result = await page.evaluate(async () => {
            const root = document.getElementById("hero-transition-track")!;
            const stage = document.getElementById("hero-sticky-stage")!;
            const grid = document.querySelector<HTMLElement>('#stats [class*="grid"]')!;
            const selected = document.querySelector<HTMLElement>('[class*="selectedMotionLayer"]')!;
            const slot = grid.parentElement!.parentElement!;
            const top = root.getBoundingClientRect().top + scrollY;
            const stageHeight = stage.getBoundingClientRect().height;
            const start =
                top +
                document.getElementById("stats-camera-track")!.getBoundingClientRect().height -
                stageHeight;
            const end =
                top +
                document.getElementById("selected-motion-track")!.getBoundingClientRect().height -
                stageHeight;
            const bounds = Element.prototype.getBoundingClientRect;
            let slotReads = 0;
            Element.prototype.getBoundingClientRect = function () {
                if (this === slot) slotReads++;
                return bounds.call(this);
            };
            const points = [0, 0.25, 0.5, 0.75, 1, 1.05, 1.1];
            const samples = [];
            const settle = async () => {
                for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame);
            };
            try {
                for (const progress of [...points, ...points.slice().reverse()]) {
                    scrollTo(0, Math.round(start + (end - start) * progress));
                    await settle();
                    const statsBounds = grid.getBoundingClientRect();
                    const selectedBounds = selected.getBoundingClientRect();
                    const labels = grid.querySelectorAll<HTMLElement>('[class*="label"]');
                    const lastLabel = labels[labels.length - 1].getBoundingClientRect();
                    samples.push({
                        progress,
                        gap: selectedBounds.top - statsBounds.bottom,
                        labelGap: selectedBounds.top - lastLabel.bottom,
                        selectedTop: selectedBounds.top,
                        stageTop: stage.getBoundingClientRect().top,
                    });
                }
                const scrollReads = slotReads;
                const beforeChromeResize = selected.getBoundingClientRect().top;
                const originalHeight = Object.getOwnPropertyDescriptor(window, "innerHeight");
                // Safari's chrome changes innerHeight while the 100svh stage
                // remains fixed. This must not move the handoff destination.
                Object.defineProperty(window, "innerHeight", {
                    configurable: true,
                    value: innerHeight + 96,
                });
                window.dispatchEvent(new Event("resize"));
                await settle();
                const chromeShift = selected.getBoundingClientRect().top - beforeChromeResize;
                if (originalHeight) Object.defineProperty(window, "innerHeight", originalHeight);
                else Reflect.deleteProperty(window, "innerHeight");
                return { samples, slotReads: scrollReads, chromeShift };
            } finally {
                Element.prototype.getBoundingClientRect = bounds;
            }
        });
        await testInfo.attach(`stats-selected-spacing-${width}x${height}`, {
            body: JSON.stringify(result, null, 2),
            contentType: "application/json",
        });
        for (const sample of result.samples) {
            expect(
                sample.gap,
                `${width}x${height}, progress ${sample.progress}`
            ).toBeGreaterThanOrEqual(23);
            expect(sample.labelGap).toBeGreaterThanOrEqual(23);
        }
        const forward = result.samples.slice(0, 7);
        const backward = result.samples.slice(7).reverse();
        forward.forEach((sample, i) =>
            expect(backward[i].selectedTop).toBeCloseTo(sample.selectedTop, 0)
        );
        // Preserve the linear entry and carry the same gap through natural flow.
        const relativeTop = (index: number) => forward[index].selectedTop - forward[index].stageTop;
        expect(Math.abs(relativeTop(2) - (relativeTop(0) + relativeTop(4)) / 2)).toBeLessThan(1);
        expect(Math.abs(forward[6].gap - forward[4].gap)).toBeLessThan(1);
        expect(result.slotReads).toBe(0);
        expect(result.chromeShift).toBe(0);
    }
});

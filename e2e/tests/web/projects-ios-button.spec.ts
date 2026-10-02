import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context, hasTouch }, testInfo) => {
    test.skip(!hasTouch, "desktop intentionally enables velocity-based snapping");
    await context.addCookies([
        {
            name: "site-preloader",
            value: "1",
            url: String(testInfo.project.use.baseURL),
        },
    ]);
});

test("Projects CTA keeps its painted layer while the iOS scene is pinned", async ({ page }) => {
    await page.goto("/en");

    const section = page.locator("#projects");
    const button = section.locator('a[href$="/works"]');
    await expect(button).toBeAttached();
    await expect(section.locator(".pin-spacer")).toBeAttached();
    await page.waitForTimeout(800);

    const sectionStart = await section.evaluate((element) => {
        const view = element.ownerDocument.defaultView!;

        return element.getBoundingClientRect().top + view.scrollY;
    });
    await section.evaluate(
        (element, y) => element.ownerDocument.defaultView!.scrollTo(0, y),
        sectionStart
    );
    await page.waitForTimeout(700);

    const bounds = await section.evaluate((element) => {
        const view = element.ownerDocument.defaultView!;

        return {
            start: element.getBoundingClientRect().top + view.scrollY,
            travel: Math.max(element.getBoundingClientRect().height - view.innerHeight, 1),
        };
    });

    for (const progress of [0.2, 0.45, 0.7, 0.9]) {
        await section.evaluate(
            (element, { start, travel, progress }) =>
                element.ownerDocument.defaultView!.scrollTo(0, start + travel * progress),
            { ...bounds, progress }
        );
        await page.waitForTimeout(120);

        const state = await button.evaluate((element) => {
            const motionLayer = element.parentElement!;
            const view = element.ownerDocument.defaultView!;
            const buttonStyle = view.getComputedStyle(element);
            const motionStyle = view.getComputedStyle(motionLayer);

            return {
                background: buttonStyle.backgroundColor,
                backfaceVisibility: buttonStyle.backfaceVisibility,
                buttonOpacity: buttonStyle.opacity,
                motionOpacity: Number.parseFloat(motionStyle.opacity),
                motionTransform: motionStyle.transform,
                motionVisibility: motionStyle.visibility,
            };
        });

        expect(state.background).toBe("rgb(234, 253, 39)");
        expect(state.backfaceVisibility).toBe("hidden");
        expect(state.buttonOpacity).toBe("1");
        expect(state.motionOpacity).toBeGreaterThan(0.99);
        expect(state.motionTransform).not.toBe("none");
        expect(state.motionVisibility).toBe("visible");
    }
});

test("Projects does not change the iOS scroll position after touch scrolling stops", async ({
    page,
}) => {
    await page.goto("/en");
    const section = page.locator("#projects");
    // SSR contains the section before GSAP constructs its scroll range. Measuring
    // then gives a zero distance and tests hydration, not the pinned scene.
    await expect(section.locator(".pin-spacer")).toBeAttached();
    await page.waitForTimeout(800);

    const range = await section.evaluate((element) => {
        const view = element.ownerDocument.defaultView!;
        const scene = element.querySelector("[class*='stage']")!;
        const spacer = scene.parentElement!;
        const start = spacer.getBoundingClientRect().top + view.scrollY;

        return {
            start,
            distance: spacer.getBoundingClientRect().height - scene.getBoundingClientRect().height,
        };
    });

    await section.evaluate(
        (element, { start, distance }) =>
            element.ownerDocument.defaultView!.scrollTo(0, start + distance * 0.78),
        range
    );
    await page.waitForTimeout(60);
    await section.evaluate(
        (element, { start, distance }) =>
            element.ownerDocument.defaultView!.scrollTo(0, start + distance * 0.85),
        range
    );
    await page.waitForTimeout(80);

    const stoppedAt = await section.evaluate(
        (element) => element.ownerDocument.defaultView!.scrollY
    );
    await page.waitForTimeout(500);
    const remainedAt = await section.evaluate(
        (element) => element.ownerDocument.defaultView!.scrollY
    );

    expect(Math.abs(remainedAt - stoppedAt)).toBeLessThanOrEqual(1);
});

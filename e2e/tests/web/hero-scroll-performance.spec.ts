import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }, testInfo) => {
    await context.addCookies([
        { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
    ]);
});

test("Hero and Stats scroll without remeasuring the scene or animating hidden mobile images", async ({
    page,
    hasTouch,
}, testInfo) => {
    test.setTimeout(60_000);
    await page.goto("/en");
    await expect(page.locator("#stats [data-reel-place]").first()).toBeAttached();
    await expect
        .poll(() =>
            page
                .locator("#stats [data-reel-place]")
                .first()
                .evaluate((element) => element.style.transform)
        )
        .not.toBe("");
    await page.evaluate(() => document.fonts.ready);
    // Hidden floaters still participate in the unchanged page entrance stagger.
    // Measure scroll work after that entrance, not its final opacity commit.
    await expect
        .poll(() =>
            page
                .locator('#hero [class*="lowerFloater"]')
                .evaluateAll((elements) =>
                    elements.every((element) => getComputedStyle(element).opacity === "1")
                )
        )
        .toBe(true);
    // Let the shared startup ScrollTrigger refreshes (0/250/800ms) finish.
    await page.waitForTimeout(1100);

    const result = await page.evaluate(async () => {
        const track = document.getElementById("hero-transition-track")!;
        const heroTrack = document.getElementById("hero-scroll-track")!;
        const cameraTrack = document.getElementById("stats-camera-track")!;
        const stage = document.getElementById("hero-sticky-stage")!;
        const start = track.getBoundingClientRect().top + scrollY;
        const end =
            start +
            cameraTrack.getBoundingClientRect().height -
            stage.getBoundingClientRect().height;
        const reads: Record<string, number> = {};
        const restores: (() => void)[] = [];
        for (const [prototype, properties] of [
            [HTMLElement.prototype, ["offsetTop", "offsetLeft", "offsetWidth", "offsetHeight"]],
            [Element.prototype, ["clientHeight", "clientWidth"]],
        ] as const) {
            for (const property of properties) {
                const descriptor = Object.getOwnPropertyDescriptor(prototype, property)!;
                Object.defineProperty(prototype, property, {
                    ...descriptor,
                    get() {
                        if (this === heroTrack) reads[property] = (reads[property] ?? 0) + 1;
                        return descriptor.get!.call(this);
                    },
                });
                restores.push(() => Object.defineProperty(prototype, property, descriptor));
            }
        }
        const bounds = Element.prototype.getBoundingClientRect;
        Element.prototype.getBoundingClientRect = function () {
            if (this === heroTrack) reads.bounds = (reads.bounds ?? 0) + 1;
            return bounds.call(this);
        };
        restores.push(() => {
            Element.prototype.getBoundingClientRect = bounds;
        });

        let hiddenWrites = 0;
        const hiddenImages = Array.from(
            track.querySelectorAll<HTMLElement>('[class*="lowerFloater"]')
        ).filter((element) => getComputedStyle(element).display === "none");
        const observer = new MutationObserver((entries) => {
            hiddenWrites += entries.length;
        });
        hiddenImages.forEach((element) =>
            observer.observe(element, { attributes: true, attributeFilter: ["style"] })
        );
        const frames: number[] = [];
        try {
            for (let i = 0; i < 48; i++) {
                const progress = i < 24 ? i / 23 : (47 - i) / 23;
                scrollTo(0, start + (end - start) * progress);
                frames.push(await new Promise<number>(requestAnimationFrame));
            }
        } finally {
            observer.disconnect();
            restores.forEach((restore) => restore());
        }
        return {
            reads,
            hiddenWrites,
            intervals: frames.slice(1).map((time, index) => time - frames[index]),
        };
    });
    await testInfo.attach("hero-scroll-work", {
        body: JSON.stringify(result, null, 2),
        contentType: "application/json",
    });
    expect(result.reads).toEqual({});
    if (hasTouch && page.viewportSize()!.width <= 767) expect(result.hiddenWrites).toBe(0);
    await expect(page.locator('[class*="heroLayer"]')).toHaveCSS("visibility", "visible");
    await expect(page.locator('[class*="statsDepthPlane"]')).toHaveCSS("visibility", "hidden");
});

test("Hero progress keeps its trajectory after reverse scrolling and a viewport resize", async ({
    page,
}) => {
    await page.goto("/en");
    await page.evaluate(() => document.fonts.ready);
    await expect
        .poll(() =>
            page
                .locator("#stats [data-reel-place]")
                .first()
                .evaluate((element) => element.style.transform)
        )
        .not.toBe("");
    const title = page.locator("h1 [class*='nameLine']").first();
    await expect(title).toBeVisible();
    for (const size of [
        { width: 390, height: 844 },
        { width: 430, height: 780 },
    ]) {
        await page.setViewportSize(size);
        await page.evaluate(
            () =>
                new Promise<void>((resolve) =>
                    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
                )
        );
        const poses = await page.evaluate(async () => {
            const track = document.getElementById("hero-scroll-track")!;
            const stage = document.getElementById("hero-sticky-stage")!;
            const name = document.querySelector<HTMLElement>("h1 [class*='nameLine']")!;
            const start = track.getBoundingClientRect().top + scrollY;
            const runway =
                track.getBoundingClientRect().height - stage.getBoundingClientRect().height;
            const poses = [];
            for (const progress of [0.25, 0.75, 1, 0.75, 0.25]) {
                scrollTo(0, Math.ceil(start + runway * progress));
                await new Promise<void>((resolve) =>
                    requestAnimationFrame(() =>
                        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
                    )
                );
                poses.push({
                    x: new DOMMatrixReadOnly(getComputedStyle(name).transform).m41,
                    opacity: Number(
                        getComputedStyle(document.querySelector('[class*="heroLayer"]')!).opacity
                    ),
                    progress: (scrollY - start) / runway,
                });
            }
            return poses;
        });
        expect(poses[0].x).toBeCloseTo(poses[4].x, 2);
        expect(poses[1].x).toBeCloseTo(poses[3].x, 2);
        expect(poses[2].opacity).toBe(0);
        expect(poses[0].opacity).toBe(1);
        const endpoint = poses[2].x;
        for (const pose of poses)
            expect(Math.abs(pose.x - endpoint * pose.progress)).toBeLessThan(1);
    }
});

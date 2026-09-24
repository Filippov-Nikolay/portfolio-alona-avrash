import { expect, test } from "@playwright/test";
// Captured from the original inline camera before moving it to keyframes.
import cameraPoses from "../../fixtures/stats-camera-poses.json";

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
        let cameraWrites = 0;
        const camera = track.querySelector<HTMLElement>('[class*="statsDepthPlane"]')!;
        const animation = camera.getAnimations()[0];
        let sameAnimation = true;
        const cameraObserver = new MutationObserver((entries) => {
            cameraWrites += entries.length;
        });
        cameraObserver.observe(camera, { attributes: true, attributeFilter: ["style"] });
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
                sameAnimation &&= camera.getAnimations()[0] === animation;
            }
        } finally {
            observer.disconnect();
            cameraObserver.disconnect();
            restores.forEach((restore) => restore());
        }
        return {
            reads,
            hiddenWrites,
            cameraWrites,
            sameAnimation,
            cameraInlineStyles: [camera.style.transform, camera.style.opacity],
            intervals: frames.slice(1).map((time, index) => time - frames[index]),
        };
    });
    await testInfo.attach("hero-scroll-work", {
        body: JSON.stringify(result, null, 2),
        contentType: "application/json",
    });
    expect(result.reads).toEqual({});
    expect(result.cameraInlineStyles).toEqual(["", ""]);
    expect(result.sameAnimation).toBe(true);
    // Only visibility/pointer-events at phase boundaries, not a style write
    // each scroll frame. This measures DOM work, not iPhone paint counts.
    expect(result.cameraWrites).toBeLessThanOrEqual(4);
    if (hasTouch && page.viewportSize()!.width <= 767) expect(result.hiddenWrites).toBe(0);
    await expect(page.locator('[class*="heroLayer"]')).toHaveCSS("visibility", "visible");
    await expect(page.locator('[class*="statsDepthPlane"]')).toHaveCSS("visibility", "hidden");
});

test("Stats keyframes preserve the original camera poses after resizing and preference changes", async ({
    page,
}) => {
    await page.goto("/en");
    const plane = page.locator('[class*="statsDepthPlane"]');
    await expect
        .poll(() => plane.evaluate((element) => element.getAnimations()[0]?.playState))
        .toBe("paused");
    const initialSize = page.viewportSize()!;
    for (const width of [initialSize.width, initialSize.width <= 767 ? 1024 : 390]) {
        await page.setViewportSize({ width, height: initialSize.height });
        const reference = width <= 767 ? cameraPoses.compact : cameraPoses.wide;
        await expect
            .poll(() =>
                plane.evaluate(
                    (element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m11
                )
            )
            .toBeCloseTo(reference[0].scale, 4);
        const samples = await plane.evaluate(
            async (element, checkpoints) => {
                const animation = element.getAnimations()[0];
                const initialTime = animation.currentTime;
                const samples = [];
                for (const progress of checkpoints) {
                    animation.currentTime = progress * 1000;
                    await new Promise(requestAnimationFrame);
                    const style = getComputedStyle(element);
                    const matrix = new DOMMatrixReadOnly(style.transform);
                    samples.push({
                        opacity: Number(style.opacity),
                        scale: matrix.m11,
                        y: matrix.m42,
                        z: matrix.m43,
                    });
                }
                animation.currentTime = initialTime;
                return samples;
            },
            reference.map(({ progress }) => progress)
        );
        samples.forEach((actual, index) => {
            const original = reference[index];
            expect(Math.abs(actual.opacity - original.opacity)).toBeLessThan(0.0001);
            expect(Math.abs(actual.scale - original.scale)).toBeLessThan(0.0001);
            expect(Math.abs(actual.y - original.y)).toBeLessThan(0.01);
            expect(Math.abs(actual.z - original.z)).toBeLessThan(0.001);
        });
        await expect
            .poll(() => plane.evaluate((element) => element.getAnimations().length))
            .toBe(1);

        const beforePreference = await plane.evaluate(async (element) => {
            const root = document.getElementById("hero-transition-track")!;
            const hero = document.getElementById("hero-scroll-track")!;
            const camera = document.getElementById("stats-camera-track")!;
            const height = document
                .getElementById("hero-sticky-stage")!
                .getBoundingClientRect().height;
            const top = root.getBoundingClientRect().top + scrollY;
            const start = top + (hero.getBoundingClientRect().height - height) * 0.9;
            const end = top + camera.getBoundingClientRect().height - height;
            scrollTo(0, start + (end - start) * 0.5);
            for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame);
            const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
            return {
                scale: matrix.m11,
                time: Number(element.getAnimations()[0].currentTime),
                scrollY,
            };
        });
        expect(beforePreference.time).toBeGreaterThan(0);
        expect(beforePreference.time).toBeLessThan(1000);
        await page.emulateMedia({ reducedMotion: "reduce" });
        await expect
            .poll(() =>
                plane.evaluate((element) => {
                    const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
                    return [matrix.m11, matrix.m42, matrix.m43];
                })
            )
            .toEqual([1, 0, 0]);
        await expect
            .poll(() => plane.evaluate((element) => Number(getComputedStyle(element).opacity)))
            .toBeCloseTo(beforePreference.time / 1000, 3);
        await page.emulateMedia({ reducedMotion: "no-preference" });
        // Other sections rebuild their ScrollTriggers on a media change.
        // Compare the camera at the same document position after that refresh.
        await expect(async () => {
            const scale = await plane.evaluate(async (element, y) => {
                scrollTo(0, y);
                for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame);
                return new DOMMatrixReadOnly(getComputedStyle(element).transform).m11;
            }, beforePreference.scrollY);
            expect(scale).toBeCloseTo(beforePreference.scale, 4);
        }).toPass();
        await expect
            .poll(() => plane.evaluate((element) => element.getAnimations().length))
            .toBe(1);
        await page.evaluate(() => scrollTo(0, 0));
        await expect
            .poll(() => plane.evaluate((element) => element.getAnimations()[0].currentTime))
            .toBe(0);
    }
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

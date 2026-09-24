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

test("Selected Work reveal does not update React state during Hero render", async ({ page }) => {
    const renderWarnings: string[] = [];
    page.on("console", (message) => {
        if (message.type() === "error" && message.text().includes("Cannot update a component")) {
            renderWarnings.push(message.text());
        }
    });

    await page.goto("/en");
    await expect(page.locator("#selected-work")).toBeAttached();
    await page.waitForTimeout(500);

    const revealScroll = await page.locator("#hero-transition-track").evaluate((track) => {
        const view = track.ownerDocument.defaultView!;
        const cameraTrack = track.querySelector("#stats-camera-track")!;
        const motionTrack = track.querySelector("#selected-motion-track")!;
        const viewport = track.querySelector("#hero-sticky-stage")!;
        const stageTop = track.getBoundingClientRect().top + view.scrollY;
        const viewportHeight = viewport.getBoundingClientRect().height;
        const start =
            stageTop + Math.max(cameraTrack.getBoundingClientRect().height - viewportHeight, 1);
        const end =
            stageTop + Math.max(motionTrack.getBoundingClientRect().height - viewportHeight, 1);

        return start + (end - start) * 0.4;
    });

    await page.locator("html").evaluate((root, scrollY) => {
        const view = root.ownerDocument.defaultView!;
        view.scrollTo(0, scrollY);
        view.dispatchEvent(new Event("resize"));
    }, revealScroll);

    const viewport = page.viewportSize()!;
    await page.setViewportSize({ width: viewport.width, height: viewport.height - 64 });
    await page.setViewportSize(viewport);
    const selectedHeader = page.locator("#selected-work h2").locator("..");
    await expect
        .poll(async () =>
            Number.parseFloat(
                await selectedHeader.evaluate(
                    (element) =>
                        element.ownerDocument.defaultView!.getComputedStyle(element).opacity
                )
            )
        )
        .toBeGreaterThan(0.95);

    expect(renderWarnings).toEqual([]);
});

test("Hero camera uses compact geometry and avoids dynamic blur on touch devices", async ({
    page,
}) => {
    await page.goto("/en");
    await expect(page.locator("#stats")).toBeAttached();
    // The camera effect is installed during hydration; SSR keeps Stats hidden.
    await expect
        .poll(() =>
            page
                .locator('[class*="statsDepthPlane"]')
                .evaluate((element) => element.getAnimations()[0]?.playState)
        )
        .toBe("paused");

    if ((await page.viewportSize())!.width <= 767) {
        await expect(page.locator("[class*='titleFloaters']").locator(":scope > *")).toHaveCount(3);
    }

    const cameraState = await page.locator("#hero-transition-track").evaluate(async (track) => {
        const view = track.ownerDocument.defaultView!;
        const heroTrack = track.querySelector("#hero-scroll-track")!;
        const viewport = track.querySelector("#hero-sticky-stage")!;
        const depthPlane = track.querySelector("[class*='statsDepthPlane']")!;
        const statsGrid = track.querySelector("#stats [class*='grid']")!;
        const stageTop = track.getBoundingClientRect().top + view.scrollY;
        const viewportHeight = viewport.getBoundingClientRect().height;
        const heroRange = Math.max(heroTrack.getBoundingClientRect().height - viewportHeight, 1);

        view.scrollTo(0, stageTop + heroRange * 0.9);
        await new Promise<void>((resolve) =>
            view.requestAnimationFrame(() => view.requestAnimationFrame(() => resolve()))
        );

        const matrix = new view.DOMMatrixReadOnly(view.getComputedStyle(depthPlane).transform);
        const isTouch = view.matchMedia("(hover: none) and (pointer: coarse)").matches;

        return {
            isTouch,
            scale: matrix.m11,
            translateY: matrix.m42,
            translateZ: matrix.m43,
            filter: view.getComputedStyle(statsGrid).filter,
        };
    });

    const compactProjection = 1320 / (1320 - 220);
    expect(cameraState.scale).toBeCloseTo(cameraState.isTouch ? 2.15 * compactProjection : 2.9, 1);
    expect(cameraState.translateY).toBeCloseTo(
        cameraState.isTouch ? (-240 + 2.15 * 28) * compactProjection : -430,
        0
    );
    expect(cameraState.translateZ).toBeCloseTo(cameraState.isTouch ? 0 : 420, 0);

    if (cameraState.isTouch) {
        expect(cameraState.filter).toBe("none");
    }
});

test("Stats reels always commit their exact final digits after a tiny last scroll step", async ({
    page,
}) => {
    await page.goto("/en");
    await expect(page.locator("#stats [data-stat-index='2']")).toBeAttached();
    await expect
        .poll(() =>
            page
                .locator("#stats [data-stat-index='2'] [data-reel-place]")
                .first()
                .evaluate(
                    (reel) => (reel as unknown as { style: { transform: string } }).style.transform
                )
        )
        .not.toBe("");

    const scrollRange = await page.locator("#hero-transition-track").evaluate((track) => {
        const view = track.ownerDocument.defaultView!;
        const heroTrack = track.querySelector("#hero-scroll-track")!;
        const cameraTrack = track.querySelector("#stats-camera-track")!;
        const viewport = track.querySelector("#hero-sticky-stage")!;
        const stageTop = track.getBoundingClientRect().top + view.scrollY;
        const viewportHeight = viewport.getBoundingClientRect().height;
        const heroRange = Math.max(heroTrack.getBoundingClientRect().height - viewportHeight, 1);
        const cameraRange = Math.max(
            cameraTrack.getBoundingClientRect().height - viewportHeight,
            1
        );

        return {
            start: stageTop + heroRange * 0.9,
            end: stageTop + cameraRange,
        };
    });

    const scrollToDepthProgress = async (progress: number) => {
        await page.locator("html").evaluate(
            (root, { start, end, progress: nextProgress }) => {
                const view = root.ownerDocument.defaultView!;
                view.scrollTo(0, start + (end - start) * nextProgress);
            },
            { ...scrollRange, progress }
        );
        await page
            .locator("html")
            .evaluate(
                (root) =>
                    new Promise<void>((resolve) =>
                        root.ownerDocument.defaultView!.requestAnimationFrame(() =>
                            root.ownerDocument.defaultView!.requestAnimationFrame(() => resolve())
                        )
                    )
            );
    };

    // Produces counter progress ~= 0.9996, close enough that the old epsilon
    // guard incorrectly discarded the final update to 1.
    await scrollToDepthProgress(0.941184);
    await scrollToDepthProgress(0.96);

    const finalPositions = () =>
        page
            .locator("#stats [data-stat-index='2'] [data-reel-place]")
            .evaluateAll((reels) =>
                reels.map(
                    (reel) => (reel as unknown as { style: { transform: string } }).style.transform
                )
            );

    await expect
        .poll(finalPositions)
        .toEqual(["translateY(-9em)", "translateY(0em)", "translateY(0em)"]);
});

test("Stats reels settle after a reversed touch scroll without lingering movement", async ({
    page,
}) => {
    await page.goto("/en");
    await expect(page.locator("#stats [data-reel-place]").first()).toBeAttached();
    await expect
        .poll(() =>
            page
                .locator("#stats [data-reel-place]")
                .first()
                .evaluate((reel) => reel.style.transform)
        )
        .not.toBe("");

    const state = await page.locator("#hero-transition-track").evaluate(async (track) => {
        const view = track.ownerDocument.defaultView!;
        const heroTrack = track.querySelector("#hero-scroll-track")!;
        const cameraTrack = track.querySelector("#stats-camera-track")!;
        const viewport = track.querySelector("#hero-sticky-stage")!;
        const stageTop = track.getBoundingClientRect().top + view.scrollY;
        const viewportHeight = viewport.getBoundingClientRect().height;
        const start =
            stageTop + Math.max(heroTrack.getBoundingClientRect().height - viewportHeight, 1) * 0.9;
        const end =
            stageTop + Math.max(cameraTrack.getBoundingClientRect().height - viewportHeight, 1);
        const yAt = (progress: number) => start + (end - start) * progress;

        for (const y of [yAt(0.94), yAt(0.7), yAt(0.91)]) {
            view.scrollTo(0, y);
            await new Promise<void>((resolve) => view.requestAnimationFrame(() => resolve()));
        }

        await new Promise<void>((resolve) => view.setTimeout(resolve, 260));

        type Dataset = { dataset: Record<string, string | undefined> };
        const reels = Array.from(track.querySelectorAll("#stats [data-reel-place]"));
        const sample = () =>
            reels.map((reel) => ({
                transform: view.getComputedStyle(reel).transform,
                transition: view.getComputedStyle(reel).transitionProperty,
                continuous: (reel as unknown as Dataset).dataset.reelContinuous,
            }));
        const settled = sample();

        await new Promise<void>((resolve) => view.setTimeout(resolve, 260));

        return { settled, afterDelay: sample() };
    });

    expect(state.afterDelay.map(({ transform }) => transform)).toEqual(
        state.settled.map(({ transform }) => transform)
    );
    for (const reel of state.settled) {
        expect(reel.transition).not.toContain("transform");
        expect(reel.transition).not.toBe("all");
    }
});

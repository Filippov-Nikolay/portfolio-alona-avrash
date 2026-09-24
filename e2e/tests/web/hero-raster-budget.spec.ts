import { expect, test } from "@playwright/test";
import { sampleHeroScene } from "../../helpers/heroScene";
// Captured before resizing the camera or merging the grid reveal into it.
import desktop from "../../fixtures/hero-scene-chromium-desktop.json";
import chromiumTouch from "../../fixtures/hero-scene-chromium-touch.json";
import webkitTouch from "../../fixtures/hero-scene-webkit-touch.json";

test("Smaller Stats raster preserves Hero, grid and Selected Work screen positions", async ({
    page,
    context,
    hasTouch,
    browserName,
}, testInfo) => {
    test.setTimeout(120_000);
    await context.addCookies([
        { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
    ]);
    const reference = hasTouch ? (browserName === "webkit" ? webkitTouch : chromiumTouch) : desktop;
    for (const [size, expected] of Object.entries(reference)) {
        const [width, height] = size.split("x").map(Number);
        await page.setViewportSize({ width, height });
        await page.goto("/en");
        const camera = page.locator('[class*="statsDepthPlane"]');
        await expect
            .poll(() => camera.evaluate((el) => el.getAnimations()[0]?.playState))
            .toBe("paused");
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(1300);
        const actual = await sampleHeroScene(page);
        let maxError = 0;
        for (let i = 0; i < expected.length; i++) {
            expect(actual[i].y).toBeCloseTo(expected[i].y, 0);
            for (const name of Object.keys(
                expected[i].bounds
            ) as (keyof (typeof expected)[number]["bounds"])[]) {
                for (let axis = 0; axis < 4; axis++) {
                    const error = Math.abs(
                        actual[i].bounds[name][axis] - expected[i].bounds[name][axis]
                    );
                    maxError = Math.max(maxError, error);
                    expect(error, `${size}, pose ${i}, ${name}[${axis}]`).toBeLessThan(0.15);
                }
            }
        }
        await testInfo.attach(`geometry-${size}`, {
            body: JSON.stringify({ maxError }),
            contentType: "application/json",
        });
        const layers = await camera.evaluate((element) => {
            const grid = element.querySelector<HTMLElement>('[class*="grid"]')!;
            const camera = element as HTMLElement;
            const stage = element.closest<HTMLElement>("[data-stats-camera-stage]")!;
            return {
                size: [camera.clientWidth, camera.clientHeight],
                grid: [grid.clientWidth, grid.clientHeight],
                areaRatio:
                    (camera.clientWidth * camera.clientHeight) /
                    (stage.clientWidth * stage.clientHeight),
                gridStyle: [
                    getComputedStyle(grid).willChange,
                    getComputedStyle(grid).backfaceVisibility,
                    getComputedStyle(grid).transform,
                ],
                reels: Array.from(element.querySelectorAll("[data-reel-place]"), (reel) => {
                    const style = getComputedStyle(reel);
                    return {
                        willChange: style.willChange,
                        backface: style.backfaceVisibility,
                        transitions: style.transitionProperty,
                        animations: reel.getAnimations().length,
                    };
                }),
            };
        });
        expect(layers.size).toEqual(layers.grid);
        expect(layers.areaRatio).toBeLessThan(0.5);
        if (hasTouch) expect(layers.gridStyle).toEqual(["auto", "visible", "none"]);
        for (const reel of layers.reels) {
            expect(reel.willChange).toBe("auto");
            expect(reel.backface).toBe("visible");
            expect(reel.transitions.split(",").map((p) => p.trim())).not.toEqual(
                expect.arrayContaining(["transform"])
            );
            expect(reel.transitions).not.toBe("all");
            expect(reel.animations).toBe(0);
        }
        await expect(page.locator('[class*="nameTrack"]')).toHaveCSS("will-change", "auto");
        await expect(page.locator('#hero [class*="NoiseLayer"][class*="noise"]')).toHaveCSS(
            "background-image",
            /hero-noise\.png/
        );
    }
});

test("Touch Stats uses one composited camera while the digits move", async ({
    page,
    context,
    browserName,
    hasTouch,
}, testInfo) => {
    test.skip(
        browserName !== "chromium" || !hasTouch,
        "LayerTree inspection requires mobile Chromium CDP"
    );
    await context.addCookies([
        { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
    ]);
    await page.goto("/en");
    const camera = page.locator('[class*="statsDepthPlane"]');
    await expect
        .poll(() => camera.evaluate((el) => el.getAnimations()[0]?.playState))
        .toBe("paused");
    await page.waitForTimeout(1200);
    const session = await context.newCDPSession(page);
    type Layer = { backendNodeId?: number; width: number; height: number; drawsContent: boolean };
    let layers: Layer[] = [];
    try {
        await session.send("DOM.enable");
        session.on("LayerTree.layerTreeDidChange", (event) => {
            layers = event.layers ?? [];
        });
        await session.send("LayerTree.enable");
        const { root } = await session.send("DOM.getDocument");
        const tracked: Record<string, number[]> = {};
        for (const [key, selector] of Object.entries({
            camera: '[class*="statsDepthPlane"]',
            grid: '#stats [class*="grid"]',
            reels: "#stats [data-reel-place]",
        })) {
            const { nodeIds } = await session.send("DOM.querySelectorAll", {
                nodeId: root.nodeId,
                selector,
            });
            tracked[key] = await Promise.all(
                nodeIds.map(
                    async (nodeId: number) =>
                        (await session.send("DOM.describeNode", { nodeId })).node.backendNodeId
                )
            );
        }
        const samples = [];
        for (const progress of [0.65, 0.72, 0.9]) {
            await page.evaluate((progress) => {
                const root = document.getElementById("hero-transition-track")!;
                const stage = document.getElementById("hero-sticky-stage")!;
                const hero = document.getElementById("hero-scroll-track")!;
                const track = document.getElementById("stats-camera-track")!;
                const top = root.getBoundingClientRect().top + scrollY;
                const height = stage.getBoundingClientRect().height;
                const start = top + (hero.getBoundingClientRect().height - height) * 0.9;
                scrollTo(
                    0,
                    start + (top + track.getBoundingClientRect().height - height - start) * progress
                );
            }, progress);
            await page.waitForTimeout(80);
            const report = () =>
                Object.fromEntries(
                    Object.entries(tracked).map(([key, ids]) => [
                        key,
                        layers
                            .filter(
                                (layer) =>
                                    layer.drawsContent &&
                                    layer.backendNodeId &&
                                    ids.includes(layer.backendNodeId)
                            )
                            .map(({ width, height }) => ({ width, height })),
                    ])
                );
            await expect.poll(() => report().camera.length).toBe(1);
            const sample = report();
            expect(sample.grid).toEqual([]);
            expect(sample.reels).toEqual([]);
            samples.push(sample);
        }
        await testInfo.attach("stats-composited-layers", {
            body: JSON.stringify(samples, null, 2),
            contentType: "application/json",
        });
    } finally {
        await session.detach();
    }
});

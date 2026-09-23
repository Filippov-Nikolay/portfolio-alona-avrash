import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { writeFileSync } from "node:fs";

test("mobile showcase keeps its full tab rule and close button visible while scrolling", async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/works/esencha?tab=gallery");

    const dialog = page.getByRole("dialog", { name: "ESENCHA" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS("transform", "none");

    const tabList = dialog.getByRole("tablist");
    await expect
        .poll(async () => {
            const rule = await tabList.evaluate((element) => ({
                rowWidth: element.getBoundingClientRect().width,
                ruleWidth: Number.parseFloat(
                    element.ownerDocument.defaultView!.getComputedStyle(element, "::after").width
                ),
            }));
            return Math.abs(rule.rowWidth - rule.ruleWidth);
        })
        .toBeLessThanOrEqual(1);

    const closeButton = dialog.getByRole("button", { name: "Close" });
    const beforeScroll = await closeButton.boundingBox();
    expect(beforeScroll).not.toBeNull();

    await dialog.evaluate((element) => {
        type ScrollCandidate = {
            scrollHeight: number;
            clientHeight: number;
            scrollTop: number;
        };
        const candidates = Array.from(element.querySelectorAll("div")) as ScrollCandidate[];
        const scroller = candidates.find(
            (candidate) => candidate.scrollHeight > candidate.clientHeight
        );
        if (!scroller) throw new Error("Showcase scroll container was not found");
        scroller.scrollTop = Math.min(900, scroller.scrollHeight - scroller.clientHeight);
    });

    await expect(closeButton).toBeVisible();
    const afterScroll = await closeButton.boundingBox();
    expect(afterScroll).not.toBeNull();
    expect(Math.abs(afterScroll!.y - beforeScroll!.y)).toBeLessThanOrEqual(1);
});

declare global {
    interface Window {
        lightboxAnimations: Animation[];
        lightboxImage: HTMLImageElement;
        lightboxSource: string;
        releaseImageDecode: () => void;
    }
}

// Gallery assets are deliberately untracked. Use deterministic artwork so this
// suite also works on CI and changing GIF frames cannot masquerade as flicker.
test.beforeEach(async ({ page, context }, testInfo) => {
    await context.addCookies([
        { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
    ]);
    await page.route("**/projects/esencha/**", (route) =>
        route.fulfill({
            contentType: "image/svg+xml",
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><path fill="#b45a8c" d="M0 0h1200v800H0z"/><circle cx="600" cy="400" r="260" fill="none" stroke="#fff" stroke-width="20"/></svg>',
        })
    );
});

async function openGallery(page: Page) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/works/esencha?tab=gallery");
    await expect(page.getByRole("dialog", { name: "ESENCHA" })).toBeVisible({ timeout: 15_000 });
    const tile = page.getByRole("button", { name: /visual 2$/i });
    await expect(tile.locator("img")).toBeVisible();
    await tile.locator("img").evaluate(async (element) => {
        const image = element as HTMLImageElement;
        await image.decode();
        window.lightboxImage = image;
        window.lightboxSource = image.currentSrc;
    });
    return tile;
}

async function controlTransition(page: Page) {
    await page.evaluate(() => {
        window.lightboxAnimations = [];
        const animate = Element.prototype.animate;
        Element.prototype.animate = function (frames, options) {
            const animation = animate.call(this, frames, options);
            if (
                this.hasAttribute("data-lightbox-frame") ||
                this.hasAttribute("data-gallery-image")
            ) {
                animation.pause();
                animation.currentTime = 0;
                window.lightboxAnimations.push(animation);
            }
            return animation;
        };
    });
}

async function assertImage(page: Page) {
    return page.evaluate(() => {
        const image = document.querySelector<HTMLImageElement>(
            '[data-testid="gallery-lightbox"] img[data-gallery-image="1"]'
        )!;
        const rect = image.getBoundingClientRect();
        return {
            same: image === window.lightboxImage,
            source: image.currentSrc === window.lightboxSource,
            aspectError: Math.abs(
                rect.width / rect.height / (image.naturalWidth / image.naturalHeight) - 1
            ),
        };
    });
}

async function captureFrame(page: Page, testInfo: TestInfo, name: string) {
    const bounds = await page
        .locator('[data-testid="gallery-lightbox"] img[data-gallery-image="1"]')
        .boundingBox();
    expect(bounds).not.toBeNull();
    const png = await page.screenshot({
        path: testInfo.outputPath(name + ".png"),
        scale: "css",
        animations: "allow",
    });
    await testInfo.attach(name, { body: png, contentType: "image/png" });
    // Read actual rendered pixels, not CSS opacity. A missing image or a
    // compositing flash changes this solid interior patch of the artwork.
    const color = await page.evaluate(
        async ({ data, x, y }) => {
            const image = new Image();
            image.src = "data:image/png;base64," + data;
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = 20;
            const context = canvas.getContext("2d")!;
            context.drawImage(image, x - 10, y - 10, 20, 20, 0, 0, 20, 20);
            const pixels = context.getImageData(0, 0, 20, 20).data;
            const sum = [0, 0, 0];
            for (let i = 0; i < pixels.length; i += 4)
                for (let c = 0; c < 3; c++) sum[c] += pixels[i + c];
            return sum.map((value) => value / 400);
        },
        {
            data: png.toString("base64"),
            x: bounds!.x + bounds!.width / 2,
            y: bounds!.y + bounds!.height / 2,
        }
    );
    for (let c = 0; c < 3; c++)
        expect(Math.abs(color[c] - [180, 90, 140][c]), name).toBeLessThan(4);
    return color.reduce((a, b) => a + b) / 3;
}

test("one decoded image survives every FLIP frame and the 550-750ms handoff", async ({
    page,
}, testInfo) => {
    test.setTimeout(60_000);
    await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
    const tile = await openGallery(page);
    await controlTransition(page);
    await tile.click();
    const lightbox = page.getByTestId("gallery-lightbox");
    await expect(lightbox).toHaveAttribute("data-phase", "opening");
    await expect(lightbox.locator("img")).toHaveCount(1);
    await expect(lightbox.getByRole("group")).toHaveCount(0);
    await page.clock.pauseAt(new Date("2026-01-01T01:00:00Z"));
    expect(
        await page.evaluate(() =>
            window.lightboxAnimations.every((animation) =>
                (animation.effect as KeyframeEffect)
                    .getKeyframes()
                    .every((frame) =>
                        Object.keys(frame).every((key) =>
                            [
                                "offset",
                                "computedOffset",
                                "easing",
                                "composite",
                                "transform",
                            ].includes(key)
                        )
                    )
            )
        )
    ).toBe(true);

    const brightness: number[] = [];
    let previousTime = 0;
    for (const time of [0, 160, 320, 480, 550, 566, 583, 600, 616, 633, 639]) {
        await page.evaluate((time) => {
            window.lightboxAnimations.forEach((animation) => {
                animation.currentTime = time;
            });
        }, time);
        await page.clock.runFor(time - previousTime);
        previousTime = time;
        const state = await assertImage(page);
        expect(state.same).toBe(true);
        expect(state.source).toBe(true);
        expect(state.aspectError).toBeLessThan(0.004);
        if (time >= 550) brightness.push(await captureFrame(page, testInfo, "opening-" + time));
    }
    await page.evaluate(() => window.lightboxAnimations.forEach((animation) => animation.finish()));
    await page.clock.runFor(1);
    previousTime = 640;
    await expect(lightbox).toHaveAttribute("data-phase", "open");
    await expect(lightbox.getByRole("group")).toHaveCount(0);
    // Tick rAF at the actual handoff offsets. Screenshots can take arbitrary
    // wall time without skipping the paints at which deferred UI is mounted.
    for (const time of [650, 667, 683, 700, 717, 733, 750]) {
        await page.clock.runFor(time - previousTime);
        previousTime = time;
        brightness.push(await captureFrame(page, testInfo, "after-handoff-" + time));
        expect((await assertImage(page)).same).toBe(true);
    }
    expect(Math.max(...brightness) - Math.min(...brightness)).toBeLessThan(3);
    await expect(lightbox.getByRole("group")).toBeVisible();
    await expect(page).toHaveURL(/image=1/);

    await lightbox.getByRole("button", { name: "Close", exact: true }).click();
    await page.clock.runFor(48);
    await expect(lightbox).toHaveAttribute("data-phase", "closing");
    for (const time of [0, 130, 260, 390, 519]) {
        await page.evaluate(
            (time) =>
                window.lightboxAnimations.slice(-2).forEach((animation) => {
                    animation.currentTime = time;
                }),
            time
        );
        const state = await assertImage(page);
        expect(state.same && state.source).toBe(true);
        expect(state.aspectError).toBeLessThan(0.004);
    }
    await page.evaluate(() =>
        window.lightboxAnimations.slice(-2).forEach((animation) => animation.finish())
    );
    await page.clock.runFor(32);
    await expect(lightbox).toHaveCount(0);
    expect(await tile.locator("img").evaluate((image) => image === window.lightboxImage)).toBe(
        true
    );
    await expect(tile).toBeFocused();
});

test("early Escape reverses the same image without mounting the gallery", async ({ page }) => {
    const tile = await openGallery(page);
    await controlTransition(page);
    await tile.click();
    const lightbox = page.getByTestId("gallery-lightbox");
    await expect(lightbox).toHaveAttribute("data-phase", "opening");
    await page.evaluate(() =>
        window.lightboxAnimations.forEach((animation) => {
            animation.currentTime = 220;
        })
    );
    await page.keyboard.press("Escape");
    await expect(lightbox).toHaveAttribute("data-phase", "closing");
    await expect(lightbox.locator("img")).toHaveCount(1);
    expect((await assertImage(page)).same).toBe(true);
    await page.evaluate(() =>
        window.lightboxAnimations.slice(-2).forEach((animation) => animation.finish())
    );
    await expect(lightbox).toHaveCount(0);
    await expect(page.getByRole("dialog")).toBeVisible();
});

test("paired slots, scrolling, reopen and reduced motion preserve their images", async ({
    page,
}) => {
    const tile = await openGallery(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (let cycle = 0; cycle < 2; cycle++) {
        await tile.click();
        const lightbox = page.getByTestId("gallery-lightbox");
        await expect(lightbox.getByRole("group")).toBeVisible();
        const pair = lightbox.getByRole("group").getByRole("button").nth(2);
        await pair.click();
        await expect(pair).toHaveAttribute("aria-current", "true");
        await expect(lightbox.locator('[data-slot="2"] img')).toHaveCount(2);
        await lightbox.getByRole("button", { name: "Close", exact: true }).click();
        await expect(lightbox).toHaveCount(0);
        await expect(page.getByRole("button", { name: /visual 3$/i })).toBeFocused();
    }
});

test("native frames keep the image and background still across open and close", async ({
    page,
}, testInfo) => {
    test.setTimeout(60_000);
    const tile = await openGallery(page);
    const samples = page.evaluate(
        () =>
            new Promise<
                {
                    phase: string;
                    same: boolean;
                    source: boolean;
                    aspectError: number;
                    scroll: number;
                    tilt: string;
                    time: number;
                }[]
            >((resolve) => {
                const frames: {
                    phase: string;
                    same: boolean;
                    source: boolean;
                    aspectError: number;
                    scroll: number;
                    tilt: string;
                    time: number;
                }[] = [];
                const started = performance.now();
                let seen = false;
                const sample = (time: number) => {
                    const box = document.querySelector<HTMLElement>(
                        '[data-testid="gallery-lightbox"]'
                    );
                    if (box) {
                        seen = true;
                        const image = box.querySelector<HTMLImageElement>(
                            'img[data-gallery-image="1"]'
                        );
                        const rect = image?.getBoundingClientRect();
                        const body = document.querySelector<HTMLElement>("[data-lightbox-open]")!;
                        frames.push({
                            phase: box.dataset.phase!,
                            same: image === window.lightboxImage,
                            source: image?.currentSrc === window.lightboxSource,
                            aspectError:
                                rect && image
                                    ? Math.abs(
                                          rect.width /
                                              rect.height /
                                              (image.naturalWidth / image.naturalHeight) -
                                              1
                                      )
                                    : 1,
                            scroll: body.scrollTop,
                            tilt: Array.from(body.querySelectorAll<HTMLElement>("button"))
                                .map((tile) => tile.style.cssText)
                                .join("|"),
                            time,
                        });
                    }
                    if ((seen && !box) || time - started > 25_000) resolve(frames);
                    else requestAnimationFrame(sample);
                };
                requestAnimationFrame(sample);
            })
    );
    await tile.click();
    const lightbox = page.getByTestId("gallery-lightbox");
    await expect(lightbox.getByRole("group")).toBeVisible();
    await lightbox.getByRole("button", { name: "Close", exact: true }).click();
    await expect(lightbox).toHaveCount(0);
    const frames = await samples;
    const intervals = frames.slice(1).map((frame, index) => frame.time - frames[index].time);
    const timingPath = testInfo.outputPath("native-frame-timing.json");
    writeFileSync(timingPath, JSON.stringify({ intervals, frames }, null, 2));
    await testInfo.attach("native-frame-timing", {
        path: timingPath,
        contentType: "application/json",
    });
    expect(frames.every((frame) => frame.same && frame.source && frame.aspectError < 0.004)).toBe(
        true
    );
    expect(new Set(frames.map((frame) => frame.tilt)).size).toBe(1);
    const closing = frames.filter((frame) => frame.phase === "closing");
    // Headless WebKit on Windows can throttle rAF independently of compositor
    // playback. Keep cadence as a diagnostic, not a machine-dependent FPS gate.
    expect(closing.length).toBeGreaterThan(0);
    expect(new Set(closing.map((frame) => frame.scroll)).size).toBe(1);
    expect(frames.some((frame) => frame.phase === "opening")).toBe(true);
});

test("decode can be cancelled without a late opening or duplicate image", async ({ page }) => {
    const tile = await openGallery(page);
    await page.evaluate(() => {
        const image = window.lightboxImage;
        const decode = image.decode.bind(image);
        image.decode = () =>
            new Promise<void>((resolve) => {
                window.releaseImageDecode = () => {
                    image.decode = decode;
                    void decode().then(resolve);
                };
            });
    });
    await tile.click();
    await expect(page.locator("[data-lightbox-open]")).toHaveCount(1);
    await expect(page.getByTestId("gallery-lightbox")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.evaluate(() => window.releaseImageDecode());
    await expect(tile).toBeEnabled();
    await tile.click();
    await expect(page.getByTestId("gallery-lightbox").getByRole("group")).toBeVisible();
    expect((await assertImage(page)).same).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("gallery-lightbox")).toHaveCount(0);
});

test("overview can close onto a later gallery tile after a viewport resize", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/works/esencha");
    const tile = page.getByRole("button", { name: /visual 2$/i });
    await expect(tile).toBeVisible({ timeout: 15_000 });
    await tile.click();
    const lightbox = page.getByTestId("gallery-lightbox");
    await expect(lightbox.getByRole("group")).toBeVisible();
    await page.setViewportSize({ width: 430, height: 932 });
    await expect.poll(() => lightbox.evaluate((element) => element.clientWidth)).toBe(406);
    const target = lightbox.getByRole("group").getByRole("button").nth(4);
    await target.click();
    await expect(target).toHaveAttribute("aria-current", "true");
    const image = lightbox.locator('[data-slot="4"] img');
    await expect(image).toHaveCount(1);
    await image.evaluate((element) => {
        window.lightboxImage = element as HTMLImageElement;
    });
    await page.keyboard.press("Escape");
    await expect(lightbox).toHaveCount(0);
    const destination = page.getByRole("button", { name: /visual 7$/i });
    await expect(destination).toBeFocused();
    expect(
        await destination.locator("img").evaluate((element) => element === window.lightboxImage)
    ).toBe(true);
});

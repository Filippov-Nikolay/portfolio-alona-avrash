import { expect, test, type Locator, type Page, type TestInfo } from "../../fixtures/test";
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

test("the scroll lock never exposes the Footer-colored root backdrop", async ({ page }) => {
    await page.goto("/en/works/esencha");
    const dialog = page.getByRole("dialog", { name: "ESENCHA" });
    await expect(dialog).toHaveAttribute("data-state", "open");
    const root = () =>
        page.evaluate(() => ({
            locked: document.documentElement.style.overflow === "hidden",
            background: getComputedStyle(document.documentElement).backgroundImage,
        }));

    expect(await root()).toEqual({ locked: true, background: "none" });

    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toHaveCount(0);
    const restored = await root();
    expect(restored.locked).toBe(false);
    expect(restored.background).toContain("linear-gradient");
});

test("showcase tabs keep their underline gap independent of platform font metrics", async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/works/esencha?tab=gallery");
    const tabs = page.getByRole("dialog", { name: "ESENCHA" }).getByRole("tab");
    await expect(tabs).toHaveCount(2);
    for (const tab of await tabs.all()) {
        await expect(tab).toHaveCSS("line-height", "25px");
        expect((await tab.boundingBox())!.height).toBe(25);
    }
});

for (const [label, viewport, minSize] of [
    ["desktop", { width: 1403, height: 845 }, 36],
    ["mobile", { width: 390, height: 844 }, 40],
] as const) {
    test(`showcase close button stays legible over the gallery on ${label}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto("/en/works/esencha?tab=gallery");
        const dialog = page.getByRole("dialog", { name: "ESENCHA" });
        await expect(dialog).toBeVisible();
        const close = dialog.getByRole("button", { name: "Close" });
        const style = await close.evaluate((button) => {
            const computed = getComputedStyle(button);
            const rect = button.getBoundingClientRect();
            return { background: computed.backgroundColor, width: rect.width, height: rect.height };
        });
        expect(style.background).toBe("rgba(0, 0, 0, 0.48)");
        expect(style.width).toBeGreaterThanOrEqual(minSize);
        expect(style.height).toBeGreaterThanOrEqual(minSize);
    });

    test(`an opened gallery image keeps the showcase close button on ${label}`, async ({
        page,
    }) => {
        await page.setViewportSize(viewport);
        await page.goto("/en/works/esencha?tab=gallery");
        const dialog = page.getByRole("dialog", { name: "ESENCHA" });
        await expect(dialog).toBeVisible({ timeout: 15_000 });
        const readClose = (button: Locator) =>
            button.evaluate((element) => {
                const computed = getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                const icon = element.querySelector("svg")!.getBoundingClientRect();
                return {
                    right: Math.round(rect.right),
                    top: Math.round(rect.top),
                    width: rect.width,
                    height: rect.height,
                    iconWidth: icon.width,
                    background: computed.backgroundColor,
                    border: computed.borderColor,
                    shadow: computed.boxShadow,
                    backdrop:
                        computed.backdropFilter ||
                        computed.getPropertyValue("-webkit-backdrop-filter"),
                };
            });
        const modalClose = await readClose(dialog.getByRole("button", { name: "Close" }));

        await page.getByRole("button", { name: /visual 2$/i }).click();
        const lightbox = page.getByTestId("gallery-lightbox");
        const lightboxClose = lightbox.getByRole("button", { name: "Close", exact: true });
        await expect(lightboxClose).toBeVisible();
        await expect.poll(() => readClose(lightboxClose)).toEqual(modalClose);
    });
}

declare global {
    interface Window {
        lightboxAnimations: Animation[];
        lightboxFades: Animation[];
        lightboxImage: HTMLImageElement;
        lightboxSource: string;
        releaseImageDecode: () => void | Promise<void>;
        gifImage: HTMLImageElement;
        gifSourceChanges: string[];
        modalEntrance: {
            scrollY: number;
            recording: boolean;
            previousFocus: Element | null;
            frames: {
                phase: string | undefined;
                scrollY: number;
                locked: boolean;
                bounds: number[];
                tiles: { width: number; radius: string; clip: string }[];
                ancestorOpacity: string;
            }[];
        };
    }
}

// Gallery assets are deliberately untracked. Use deterministic artwork so this
// suite also works on CI and changing GIF frames cannot masquerade as flicker.
test.beforeEach(async ({ page, context }, testInfo) => {
    await context.addCookies([
        { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
    ]);
    const artwork = {
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><path fill="#b45a8c" d="M0 0h1200v800H0z"/><circle cx="600" cy="400" r="260" fill="none" stroke="#fff" stroke-width="20"/></svg>',
    };
    await page.route("**/projects/esencha/**", (route) => route.fulfill(artwork));
    await page.route("**/projects/esencha/*-poster.webp", (route) => route.fulfill(artwork));
});

for (const width of [1407, 390]) {
    test.describe(`project modal entrance at ${width}px`, () => {
        test.use({ viewport: { width, height: 847 }, isMobile: false });

        test("opening from Works keeps geometry, clipping and page scroll stable", async ({
            page,
        }, testInfo) => {
            const gifRequests: string[] = [];
            page.on("request", (request) => {
                if (/\/projects\/esencha\/.*\.gif$/.test(new URL(request.url()).pathname))
                    gifRequests.push(request.url());
            });
            await page.goto("/en/works");
            await page.evaluate(() => document.fonts.ready);
            const card = page.getByTestId("works-card").filter({
                has: page.getByRole("heading", { name: "ESENCHA", exact: true }),
            });
            const trigger = card.getByRole("button", { name: /view project/i });
            await trigger.scrollIntoViewIfNeeded();
            await trigger.focus();
            await trigger.evaluate((button) => {
                button.addEventListener(
                    "click",
                    () => {
                        window.modalEntrance = {
                            scrollY,
                            recording: true,
                            previousFocus: document.activeElement,
                            frames: [],
                        };
                        const sample = () => {
                            const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
                            if (dialog) {
                                const rect = dialog.getBoundingClientRect();
                                window.modalEntrance.frames.push({
                                    phase: dialog.dataset.state,
                                    scrollY,
                                    locked: document.documentElement.style.overflow === "hidden",
                                    bounds: [rect.x, rect.y, rect.width, rect.height],
                                    ancestorOpacity: getComputedStyle(
                                        dialog.parentElement!.parentElement!
                                    ).opacity,
                                    tiles: Array.from(
                                        dialog.querySelectorAll<HTMLElement>("[data-gallery-tile]"),
                                        (tile) => ({
                                            width: tile.getBoundingClientRect().width,
                                            radius: getComputedStyle(tile).borderRadius,
                                            clip: getComputedStyle(tile).clipPath,
                                        })
                                    ),
                                });
                            }
                            if (window.modalEntrance.recording) requestAnimationFrame(sample);
                        };
                        requestAnimationFrame(sample);
                    },
                    { once: true }
                );
            });
            await trigger.click();
            const dialog = page.getByRole("dialog", { name: "ESENCHA" });
            await expect(dialog).toHaveAttribute("data-state", "open");
            await expect(
                dialog.locator('[data-gallery-tile][data-load-state="loaded"]')
            ).toHaveCount(3);
            // Leave the cursor at the click position: opening under it must not
            // trigger the flex-grow hover animation on a newly mounted preview.
            await page.waitForTimeout(550);
            const entrance = await page.evaluate(() => window.modalEntrance);
            expect(entrance.frames.length).toBeGreaterThan(1);
            const first = entrance.frames[0];
            for (const frame of entrance.frames) {
                expect(frame.locked).toBe(true);
                expect(frame.scrollY).toBe(entrance.scrollY);
                expect(frame.ancestorOpacity).toBe("1");
                frame.bounds.forEach((value, index) =>
                    expect(Math.abs(value - first.bounds[index])).toBeLessThan(1)
                );
                expect(frame.tiles).toHaveLength(3);
                frame.tiles.forEach((tile, index) => {
                    expect(tile.radius).toBe("12px");
                    expect(tile.clip).toBe("inset(0px round 12px)");
                    expect(Math.abs(tile.width - first.tiles[index].width)).toBeLessThan(1);
                });
            }
            expect(gifRequests).toEqual([]);
            const tile = await dialog.locator('[data-gallery-tile="0"]').boundingBox();
            const screenshot = await page.screenshot({ scale: "css" });
            await testInfo.attach("project-modal-open", {
                body: screenshot,
                contentType: "image/png",
            });
            const pixels = await page.evaluate(
                async ({ data, x, y }) => {
                    const image = new Image();
                    image.src = "data:image/png;base64," + data;
                    await image.decode();
                    const canvas = document.createElement("canvas");
                    canvas.width = canvas.height = 20;
                    const context = canvas.getContext("2d")!;
                    context.drawImage(image, x, y, 20, 20, 0, 0, 20, 20);
                    return {
                        corner: Array.from(context.getImageData(1, 1, 1, 1).data).slice(0, 3),
                        interior: Array.from(context.getImageData(15, 15, 1, 1).data).slice(0, 3),
                    };
                },
                {
                    data: screenshot.toString("base64"),
                    x: Math.ceil(tile!.x),
                    y: Math.ceil(tile!.y),
                }
            );
            // The image must actually be cut away at its rounded corner, not
            // merely report a border-radius while painting a square GPU layer.
            pixels.corner.forEach((value, index) =>
                expect(Math.abs(value - [244, 244, 245][index])).toBeLessThan(5)
            );
            pixels.interior.forEach((value, index) =>
                expect(Math.abs(value - [180, 90, 140][index])).toBeLessThan(5)
            );
            await page.keyboard.press("Escape");
            await expect(dialog).toHaveCount(0);
            await page.evaluate(() => {
                window.modalEntrance.recording = false;
            });
            expect(await page.evaluate(() => scrollY)).toBe(entrance.scrollY);
            expect(await page.evaluate(() => document.documentElement.style.overflow)).not.toBe(
                "hidden"
            );
            const closing = await page.evaluate(() =>
                window.modalEntrance.frames.filter((frame) => frame.phase === "closing")
            );
            expect(closing.length).toBeGreaterThan(0);
            expect(closing.every((frame) => frame.locked)).toBe(true);
            // WebKit does not focus buttons on pointer clicks. Restore the
            // focus that actually preceded opening in each browser.
            expect(
                await page.evaluate(
                    () => document.activeElement === window.modalEntrance.previousFocus
                )
            ).toBe(true);
        });
    });
}

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

async function controlTransition(page: Page, controlReveals = false) {
    await page.evaluate((controlReveals) => {
        window.lightboxAnimations = [];
        window.lightboxFades = [];
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
            if (
                controlReveals &&
                (this.hasAttribute("data-image-layer") || this.hasAttribute("data-reveal-veil"))
            ) {
                animation.pause();
                animation.currentTime = 0;
                window.lightboxFades.push(animation);
            }
            return animation;
        };
    }, controlReveals);
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

async function captureImageColor(
    page: Page,
    testInfo: TestInfo,
    name: string,
    index = 1,
    scope = '[data-testid="gallery-lightbox"]'
) {
    const bounds = await page.locator(`${scope} img[data-gallery-image="${index}"]`).boundingBox();
    expect(bounds).not.toBeNull();
    const png = await page.screenshot({
        path: testInfo.outputPath(name + ".png"),
        scale: "css",
        animations: "allow",
    });
    await testInfo.attach(name, { body: png, contentType: "image/png" });
    // Read actual rendered pixels, not CSS opacity. A missing image or a
    // compositing flash changes this solid interior patch of the artwork.
    return page.evaluate(
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
}

async function captureFrame(page: Page, testInfo: TestInfo, name: string) {
    const color = await captureImageColor(page, testInfo, name);
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

for (const selectedIndex of [2, 3]) {
    test(`row companion fades in and out when opening image ${selectedIndex + 1}`, async ({
        page,
    }, testInfo) => {
        test.setTimeout(60_000);
        await openGallery(page);
        await controlTransition(page, true);
        const tile = page.getByRole("button", {
            name: new RegExp(`visual ${selectedIndex + 1}$`, "i"),
        });
        await tile.locator("img").evaluate((image) => {
            window.lightboxImage = image as HTMLImageElement;
        });
        await tile.click();
        const lightbox = page.getByTestId("gallery-lightbox");
        await expect(lightbox).toHaveAttribute("data-phase", "opening");
        await expect(lightbox.locator("img")).toHaveCount(1);
        await page.evaluate(() =>
            window.lightboxAnimations.forEach((animation) => animation.finish())
        );
        await expect(lightbox.getByRole("group")).toBeVisible();

        const companionIndex = selectedIndex === 2 ? 3 : 2;
        const companion = lightbox.locator(`[data-image-layer="${companionIndex}"]`);
        await expect(companion.locator("img")).toHaveCount(1);
        // Offscreen neighbors must not allocate extra opacity animations.
        expect(
            await page.evaluate(
                (index) =>
                    window.lightboxFades.every(
                        (animation) =>
                            (
                                (animation.effect as KeyframeEffect).target as HTMLElement
                            ).closest<HTMLElement>("[data-image-layer]")?.dataset.imageLayer ===
                            String(index)
                    ),
                companionIndex
            )
        ).toBe(true);
        const setFadeTime = async (time: number | "finish") => {
            await page.evaluate(
                ({ index, time }) => {
                    const animation = window.lightboxFades
                        .filter(
                            (item) =>
                                (
                                    (item.effect as KeyframeEffect).target as HTMLElement
                                ).closest<HTMLElement>("[data-image-layer]")?.dataset.imageLayer ===
                                String(index)
                        )
                        .at(-1)!;
                    if (time === "finish") animation.finish();
                    else animation.currentTime = time;
                },
                { index: companionIndex, time }
            );
        };
        const artworkDistance = (color: number[]) =>
            color.reduce(
                (sum, value, channel) => sum + Math.abs(value - [180, 90, 140][channel]),
                0
            );
        const openingColors: number[][] = [];
        // The right-side launch also tests closing halfway through the reveal.
        for (const time of selectedIndex === 2 ? [0, 40, 80, 119] : [0, 30, 60]) {
            await setFadeTime(time);
            openingColors.push(
                await captureImageColor(page, testInfo, `row-reveal-${time}`, companionIndex)
            );
        }
        const openingDistances = openingColors.map(artworkDistance);
        expect(openingDistances[0]).toBeGreaterThan(30);
        for (let i = 1; i < openingDistances.length; i++)
            expect(openingDistances[i]).toBeLessThan(openingDistances[i - 1] - 3);
        if (selectedIndex === 2) {
            expect(openingDistances.at(-1)).toBeLessThan(4);
            await setFadeTime("finish");
            await expect
                .poll(() =>
                    companion.evaluate((element) => element.getAnimations({ subtree: true }).length)
                )
                .toBe(0);
            await expect(companion.locator("[data-reveal-veil]")).toHaveCount(0);
        }
        const opacityBeforeClose = await companion.evaluate((element) => {
            const veil = element.querySelector("[data-reveal-veil]");
            const covered = veil ? Number(getComputedStyle(veil).opacity) : 0;
            return Number(getComputedStyle(element).opacity) * (1 - covered);
        });
        await lightbox.getByRole("button", { name: "Close", exact: true }).click();
        await expect(lightbox).toHaveAttribute("data-phase", "preparing-close");
        expect(
            await companion.evaluate((element) => Number(getComputedStyle(element).opacity))
        ).toBeCloseTo(opacityBeforeClose, 3);
        const closingDistances: number[] = [];
        for (const fraction of [0, 0.25, 0.5, 0.99]) {
            await setFadeTime(160 * opacityBeforeClose * fraction);
            closingDistances.push(
                artworkDistance(
                    await captureImageColor(page, testInfo, `row-hide-${fraction}`, companionIndex)
                )
            );
        }
        expect(Math.abs(closingDistances[0] - openingDistances.at(-1)!)).toBeLessThanOrEqual(3);
        for (let i = 1; i < closingDistances.length; i++)
            expect(closingDistances[i]).toBeGreaterThan(closingDistances[i - 1] + 3);
        await setFadeTime("finish");
        await expect(lightbox).toHaveAttribute("data-phase", "closing");
        await expect(companion).toHaveCSS("opacity", "0");
        expect(
            await lightbox
                .locator(`img[data-gallery-image="${selectedIndex}"]`)
                .evaluate((image) => image === window.lightboxImage)
        ).toBe(true);
        await expect(page.locator(`img[data-gallery-image="${companionIndex}"]`)).toHaveCount(1);
        await page.evaluate(() =>
            window.lightboxAnimations.slice(-2).forEach((animation) => animation.finish())
        );
        await expect(lightbox).toHaveCount(0);
        await expect(tile).toBeFocused();
    });
}

test("closing restores a late companion before revealing the tiles", async ({ page }) => {
    await openGallery(page);
    await page.evaluate(() => {
        const decode = HTMLImageElement.prototype.decode;
        HTMLImageElement.prototype.decode = function () {
            if (this.dataset.galleryImage !== "3") return decode.call(this);
            return new Promise<void>((resolve, reject) => {
                window.releaseImageDecode = async () => {
                    HTMLImageElement.prototype.decode = decode;
                    await decode.call(this).then(resolve, reject);
                };
            });
        };
    });
    const tile = page.getByRole("button", { name: /visual 3$/i });
    await tile.click();
    const lightbox = page.getByTestId("gallery-lightbox");
    await expect(lightbox.getByRole("group")).toBeVisible({ timeout: 10_000 });
    // Only hold the close: native opening avoids racing StrictMode's entrance
    // effect replay, which can replace the test-controlled animation handles.
    await controlTransition(page);
    await expect.poll(() => page.evaluate(() => typeof window.releaseImageDecode)).toBe("function");
    const companion = lightbox.locator('[data-image-layer="3"]');
    await expect(companion.locator("img")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(lightbox).toHaveAttribute("data-phase", "preparing-close");
    await expect(page.locator("[data-lightbox-open]")).toHaveCSS("visibility", "hidden");
    await page.evaluate(() => window.releaseImageDecode());
    await expect(lightbox).toHaveAttribute("data-phase", "closing");
    await expect(companion.locator("img")).toHaveCount(0);
    await expect(companion).toHaveCSS("opacity", "0");
    await expectBackgroundReady(page, 2);
    await page.evaluate(() =>
        window.lightboxAnimations.slice(-2).forEach((animation) => animation.finish())
    );
    await expect(lightbox).toHaveCount(0);
    await expect(tile).toBeFocused();
});

async function expectBackgroundReady(page: Page, returningIndex: number) {
    const state = await page.locator("[data-lightbox-open]").evaluate((body, returningIndex) => {
        const bounds = body.getBoundingClientRect();
        const visible = Array.from(
            body.querySelectorAll<HTMLElement>("[data-gallery-tile]")
        ).filter((host) => {
            const rect = host.getBoundingClientRect();
            return (
                Number(host.dataset.galleryTile) !== returningIndex &&
                rect.bottom > bounds.top &&
                rect.top < bounds.bottom
            );
        });
        return {
            visible: getComputedStyle(body).visibility,
            count: visible.length,
            incomplete: visible
                .filter((host) => {
                    const image = host.querySelector("img");
                    return (
                        !image ||
                        !image.getAttribute("src") ||
                        !image.complete ||
                        !image.naturalWidth ||
                        getComputedStyle(image).visibility !== "visible" ||
                        getComputedStyle(image).objectFit !== "cover"
                    );
                })
                .map((host) => host.dataset.galleryTile),
        };
    }, returningIndex);
    expect(state.visible).toBe("visible");
    expect(state.count).toBeGreaterThan(1);
    expect(state.incomplete).toEqual([]);
}

test("closing exposes restored tiles and keeps GIFs valid without a poster", async ({
    page,
}, testInfo) => {
    test.setTimeout(60_000);
    await page.route("**/projects/esencha/*-poster.webp", (route) =>
        route.fulfill({ status: 404 })
    );
    await page.addInitScript(() => {
        // Cross-origin artwork can prevent poster capture in production.
        HTMLCanvasElement.prototype.toDataURL = () => {
            throw new DOMException("Tainted canvas", "SecurityError");
        };
    });
    await openGallery(page);
    const tile = page.getByRole("button", { name: /visual 3$/i });
    await tile.click();
    const lightbox = page.getByTestId("gallery-lightbox");
    await expect(lightbox.getByRole("group")).toBeVisible();
    await expect(lightbox.locator('[data-image-layer="3"] img')).toHaveCount(1);
    await controlTransition(page);
    await page.keyboard.press("Escape");
    await expect(lightbox).toHaveAttribute("data-phase", "closing");
    await expect(lightbox.locator("img")).toHaveCount(1);
    for (const time of [0, 260, 519]) {
        await page.evaluate(
            (time) =>
                window.lightboxAnimations.forEach((animation) => {
                    animation.currentTime = time;
                }),
            time
        );
        await expectBackgroundReady(page, 2);
    }
    for (const index of [0, 1]) {
        const color = await captureImageColor(
            page,
            testInfo,
            `restored-tile-${index}`,
            index,
            "[data-lightbox-open]"
        );
        for (let channel = 0; channel < 3; channel++)
            expect(Math.abs(color[channel] - [180, 90, 140][channel])).toBeLessThan(4);
    }
    await page.evaluate(() => window.lightboxAnimations.forEach((animation) => animation.finish()));
    await expect(lightbox).toHaveCount(0);
    await expect(tile).toBeFocused();
    await expect(page.locator('[data-gallery-tile="0"] img')).toHaveAttribute(
        "src",
        "/projects/esencha/001.gif"
    );
});

for (const direct of [true, false]) {
    test(`GIF ${direct ? "opened directly" : "reached by scrolling"} survives a failed preview and closes smoothly`, async ({
        page,
    }) => {
        await page.route("**/projects/esencha/*-poster.webp", (route) =>
            route.fulfill({ status: 503, body: "Preview unavailable" })
        );
        // Keep the original pending after the preview fails, as on a cold CDN
        // request. A rejected preview decode must follow this fallback load.
        await page.route("**/projects/esencha/014.gif", async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 150));
            await route.fallback();
        });
        const tile = await openGallery(page);
        if (direct) await page.getByRole("button", { name: /visual 1$/i }).click();
        else await tile.click();
        const lightbox = page.getByTestId("gallery-lightbox");
        await expect(lightbox.getByRole("group")).toBeVisible();
        if (!direct) {
            const scroll = lightbox.locator("[data-gallery-scroll]");
            await scroll.dispatchEvent("touchstart");
            await scroll.evaluate((element) => {
                element.scrollTop = element.clientHeight * 9;
            });
        }
        const index = direct ? 0 : 13;
        const host = lightbox.locator(`[data-image-layer="${index}"]`);
        const image = host.locator("img");
        await expect(image).toHaveCount(1);
        await image.evaluate(async (element) => {
            window.gifImage = element as HTMLImageElement;
            await window.gifImage.decode();
        });
        await expect(host).toHaveText("");
        await controlTransition(page);
        await page.keyboard.press("Escape");
        await expect(lightbox).toHaveAttribute("data-phase", "closing");
        const widths: number[] = [];
        for (const time of [0, 260, 519]) {
            await page.evaluate((time) => {
                window.lightboxAnimations.forEach((animation) => {
                    animation.currentTime = time;
                });
            }, time);
            expect(await image.evaluate((element) => element === window.gifImage)).toBe(true);
            widths.push((await image.boundingBox())!.width);
            await expect(host).toHaveText("");
        }
        expect(widths[1]).toBeLessThan(widths[0]);
        expect(widths[2]).toBeLessThan(widths[1]);
        await page.evaluate(() =>
            window.lightboxAnimations.forEach((animation) => animation.finish())
        );
        await expect(lightbox).toHaveCount(0);
        await expect(
            page.getByRole("button", { name: new RegExp(`visual ${index + 1}$`, "i") })
        ).toBeFocused();
    });
}

test("an interrupted GIF decode does not skip the closing animation", async ({ page }) => {
    await openGallery(page);
    const tile = page.getByRole("button", { name: /visual 1$/i });
    await tile.click();
    const lightbox = page.getByTestId("gallery-lightbox");
    await expect(lightbox.getByRole("group")).toBeVisible();
    const image = lightbox.locator('img[data-gallery-image="0"]');
    await image.evaluate((element) => {
        const image = element as HTMLImageElement;
        window.gifImage = image;
        const decode = image.decode.bind(image);
        image.decode = () => {
            image.decode = decode;
            return Promise.reject(new DOMException("Decode interrupted", "EncodingError"));
        };
    });
    await controlTransition(page);
    await page.keyboard.press("Escape");
    await expect(lightbox).toHaveAttribute("data-phase", "closing");
    expect(await image.evaluate((element) => element === window.gifImage)).toBe(true);
    expect(
        await image.evaluate((element) => (element as HTMLImageElement).naturalWidth)
    ).toBeGreaterThan(0);
    expect(
        await page.evaluate(() =>
            window.lightboxAnimations.map((animation) => animation.effect!.getTiming().duration)
        )
    ).toEqual([520, 520]);
    await page.evaluate(() => window.lightboxAnimations.forEach((animation) => animation.finish()));
    await expect(lightbox).toHaveCount(0);
    await expect(tile).toBeFocused();
});

test("GIFs stay static throughout touch scrolling and only the settled slot plays", async ({
    page,
}) => {
    test.setTimeout(60_000);
    let fullGifRequests = 0;
    page.on("request", (request) => {
        if (new URL(request.url()).pathname.endsWith("/014.gif")) fullGifRequests++;
    });
    await openGallery(page);
    await page.getByRole("button", { name: /visual 1$/i }).click();
    const lightbox = page.getByTestId("gallery-lightbox");
    const scroll = lightbox.locator("[data-gallery-scroll]");
    await expect(lightbox.getByRole("group")).toBeVisible();
    const launchGif = lightbox.locator('img[data-gallery-image="0"]');
    await expect(launchGif).toHaveAttribute("src", "/projects/esencha/001.gif");
    await scroll.dispatchEvent("touchstart");
    await expect(launchGif).toHaveAttribute("src", /-poster\.webp$/);
    await scroll.evaluate((element) => {
        element.scrollTop = element.clientHeight * 9;
    });
    const gif = lightbox.locator('img[data-gallery-image="13"]');
    await expect(gif).toHaveAttribute("src", /-poster\.webp$/);
    // Holding a touch still must not restart a GIF just because the debounce
    // has elapsed: the next touchmove would otherwise hitch again.
    await page.waitForTimeout(300);
    await expect(gif).toHaveAttribute("src", /-poster\.webp$/);
    expect(fullGifRequests).toBe(0);
    await gif.evaluate((image) => {
        window.gifImage = image as HTMLImageElement;
    });
    await scroll.dispatchEvent("touchend");
    await expect(gif).toHaveAttribute("src", "/projects/esencha/014.gif");
    await expect.poll(() => fullGifRequests).toBe(1);
    await expect(launchGif).toHaveAttribute("src", /-poster\.webp$/);

    await scroll.dispatchEvent("touchstart");
    await expect(gif).toHaveAttribute("src", /-poster\.webp$/);
    await gif.evaluate((image) => {
        window.gifSourceChanges = [];
        new MutationObserver((records) => {
            records.forEach(() => window.gifSourceChanges.push(image.getAttribute("src")!));
        }).observe(image, { attributes: true, attributeFilter: ["src"] });
    });
    for (const position of [9.2, 9.5, 9.8, 10.1, 9.7, 9]) {
        await scroll.evaluate((element, position) => {
            element.scrollTop = element.clientHeight * position;
        }, position);
        await page.evaluate(
            () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        );
    }
    expect(await page.evaluate(() => window.gifSourceChanges)).toEqual([]);
    expect(fullGifRequests).toBe(1);
    expect(await gif.evaluate((image) => image === window.gifImage)).toBe(true);

    // Closing from a moving GIF must keep the preview stable for the FLIP.
    await controlTransition(page);
    await page.keyboard.press("Escape");
    await expect(lightbox).toHaveAttribute("data-phase", "closing");
    await expect(gif).toHaveAttribute("src", /-poster\.webp$/);
    expect(await gif.evaluate((image) => image === window.gifImage)).toBe(true);
    await expectBackgroundReady(page, 13);
    await page.evaluate(() => window.lightboxAnimations.forEach((animation) => animation.finish()));
    await expect(lightbox).toHaveCount(0);
    await expect(page.getByRole("button", { name: /visual 14$/i })).toBeFocused();
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
    await controlTransition(page);
    await page.keyboard.press("Escape");
    await expect(lightbox).toHaveAttribute("data-phase", "closing");
    await expectBackgroundReady(page, 6);
    await page.evaluate(() => window.lightboxAnimations.forEach((animation) => animation.finish()));
    await expect(lightbox).toHaveCount(0);
    const destination = page.getByRole("button", { name: /visual 7$/i });
    await expect(destination).toBeFocused();
    expect(
        await destination.locator("img").evaluate((element) => element === window.lightboxImage)
    ).toBe(true);
});

test.describe("lightbox edges at fractional dimensions", () => {
    test.use({ viewport: { width: 1407, height: 847 }, deviceScaleFactor: 1.25, isMobile: false });

    test("scrolling leaves no light strip along the modal edge", async ({ page }, testInfo) => {
        await page.route("**/projects/rosso/**", (route) =>
            route.fulfill({
                contentType: "image/svg+xml",
                body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="1000"><path fill="#b45a8c" d="M0 0h400v1000H0z"/></svg>',
            })
        );
        await page.goto("/en/works/rosso?tab=gallery");
        const dialog = page.getByRole("dialog", { name: "Rosso" });
        await expect(dialog).toHaveCSS("transform", "none");
        await dialog.evaluate((element) => {
            // Browser zoom and responsive layouts can both produce these sizes.
            Object.assign(element.style, {
                width: "1105.25px",
                height: "740.25px",
                maxWidth: "none",
                maxHeight: "none",
                backgroundColor: "#ffffff",
            });
        });
        await page.getByRole("button", { name: /visual 2$/i }).click();
        const lightbox = page.getByTestId("gallery-lightbox");
        await expect(lightbox.getByRole("group")).toBeVisible();
        const scroll = lightbox.locator("[data-gallery-scroll]");
        for (const position of [1.25, 1.75]) {
            await scroll.evaluate((element, position) => {
                element.scrollTop = element.clientHeight * position;
            }, position);
            await expect(
                lightbox.getByRole("group").getByRole("button").nth(Math.round(position))
            ).toHaveAttribute("aria-current", "true");
            const bounds = (await dialog.boundingBox())!;
            const png = await page.screenshot({
                path: testInfo.outputPath(`right-edge-${position}.png`),
            });
            const edge = await page.evaluate(
                async ({ data, bounds }) => {
                    const screenshot = new Image();
                    screenshot.src = "data:image/png;base64," + data;
                    await screenshot.decode();
                    const dpr = window.devicePixelRatio;
                    const canvas = document.createElement("canvas");
                    canvas.width = 2;
                    canvas.height = Math.floor((bounds.height - 100) * dpr);
                    const context = canvas.getContext("2d")!;
                    context.drawImage(
                        screenshot,
                        Math.floor((bounds.x + bounds.width) * dpr) - 1,
                        Math.ceil((bounds.y + 50) * dpr),
                        2,
                        canvas.height,
                        0,
                        0,
                        2,
                        canvas.height
                    );
                    const pixels = context.getImageData(0, 0, 2, canvas.height).data;
                    const contamination = [0, 0];
                    // Rosso's red background has no green or blue. White from the
                    // modal underneath is visible even in a fraction of an edge pixel.
                    for (let i = 0; i < pixels.length; i += 4) {
                        const column = (i / 4) % 2;
                        contamination[column] = Math.max(
                            contamination[column],
                            pixels[i + 1],
                            pixels[i + 2]
                        );
                    }
                    return contamination;
                },
                { data: png.toString("base64"), bounds }
            );
            expect(edge[0]).toBeLessThan(5);
            // The partially covered outer pixel can blend with the dark overlay,
            // but must never expose the white modal surface below the GPU layer.
            expect(edge[1]).toBeLessThan(100);
            const frame = (await lightbox.locator("[data-lightbox-frame]").boundingBox())!;
            expect(Math.abs(frame.width - bounds.width)).toBeLessThan(0.02);
            expect(Math.abs(frame.height - bounds.height)).toBeLessThan(0.02);
        }
        await page.keyboard.press("Escape");
        await expect(lightbox).toHaveCount(0);
    });
});

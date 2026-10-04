import { expect, test } from "../../fixtures/test";

test.beforeEach(async ({ context }) => {
    await context.addCookies([
        {
            name: "site-preloader",
            value: "1",
            domain: "localhost",
            path: "/",
        },
    ]);
});

test("mobile tools carousel uses native momentum and prepares peek images before interaction", async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en");

    const section = page.locator("#tools");
    const loadedToolPeekDuringHero = await page.evaluate(() =>
        performance
            .getEntriesByType("resource")
            .some(({ name }) => name.includes("image-patelscience"))
    );
    expect(loadedToolPeekDuringHero).toBe(false);
    await page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)");
    await section.evaluate((element) => {
        const view = element.ownerDocument.defaultView!;
        const absoluteTop = element.getBoundingClientRect().top + view.scrollY;
        view.scrollTo(0, absoluteTop - view.innerHeight * 0.25);
    });
    await expect(section).toBeInViewport();

    const preloadedImages = section.locator("[data-tools-peek-preloader] img");
    await expect(preloadedImages).toHaveCount(7);
    await expect
        .poll(() =>
            preloadedImages.evaluateAll((images) =>
                images.every((image) => {
                    const htmlImage = image as unknown as {
                        complete: boolean;
                        naturalWidth: number;
                    };
                    return htmlImage.complete && htmlImage.naturalWidth > 0;
                })
            )
        )
        .toBe(true);

    const optimizedSource = await preloadedImages
        .first()
        .evaluate((image) => (image as unknown as { currentSrc: string }).currentSrc);
    expect(optimizedSource).toContain("/_next/image?");

    const track = section.locator("[data-tools-track]");
    await track.scrollIntoViewIfNeeded();
    const box = await track.boundingBox();
    expect(box).not.toBeNull();

    const client = await page.context().newCDPSession(page);
    const y = box!.y + box!.height / 2;
    const startX = box!.x + box!.width * 0.72;
    const endX = box!.x + box!.width * 0.28;

    const startPosition = await track.evaluate((element) => element.scrollLeft);
    const frameSeconds = 0.016;
    const gestureStart = Date.now() / 1000;
    await client.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: startX, y }],
        timestamp: gestureStart,
    });
    const steps = 6;
    for (let step = 1; step <= steps; step++) {
        await page.waitForTimeout(16);
        await client.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: startX + ((endX - startX) * step) / steps, y }],
            timestamp: gestureStart + step * frameSeconds,
        });
    }
    const releasePosition = await track.evaluate((element) => element.scrollLeft);
    expect(releasePosition - startPosition, "the swipe itself moved the track").toBeGreaterThan(20);
    await client.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
        timestamp: gestureStart + (steps + 1) * frameSeconds,
    });

    await expect
        .poll(
            async () => (await track.evaluate((element) => element.scrollLeft)) - releasePosition,
            {
                message: "the track kept moving on its own after release",
                timeout: 3_000,
            }
        )
        .toBeGreaterThan(20);

    const illustratorCard = track.locator("button").filter({ hasText: "Illustrator" }).nth(1);
    await illustratorCard.dispatchEvent("pointerdown", {
        pointerId: 2,
        pointerType: "touch",
        clientX: 100,
        clientY: 100,
    });
    await illustratorCard.dispatchEvent("click");
    await expect(section.locator('[data-tools-peek-overlay][data-active="true"]')).toBeVisible();
});

test("a tapped tool closes on a second tap, on an empty tap and when auto-scroll resumes", async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en");

    const section = page.locator("#tools");
    await section.evaluate((element) => {
        const view = element.ownerDocument.defaultView!;
        const absoluteTop = element.getBoundingClientRect().top + view.scrollY;
        view.scrollTo(0, absoluteTop - view.innerHeight * 0.25);
    });
    await expect(section).toBeInViewport();
    await expect
        .poll(() =>
            section
                .locator("[data-tools-peek-preloader] img")
                .evaluateAll((images) =>
                    images.every((image) => (image as unknown as { complete: boolean }).complete)
                )
        )
        .toBe(true);

    const track = section.locator("[data-tools-track]");
    const overlay = section.locator('[data-tools-peek-overlay][data-active="true"]');
    const touch = { pointerId: 2, pointerType: "touch", clientX: 100, clientY: 100 };
    const tap = async (card: ReturnType<typeof track.locator>) => {
        await card.dispatchEvent("pointerdown", touch);
        await card.dispatchEvent("pointerup", touch);
        await card.dispatchEvent("click");
    };
    const card = () => track.locator("button").filter({ hasText: "Illustrator" }).nth(1);

    const arrowTransform = () =>
        card()
            .locator('[class*="cardArrowIcon"]')
            .evaluate((arrow) => getComputedStyle(arrow).transform);

    await tap(card());
    await expect(overlay).toBeVisible();
    await expect.poll(arrowTransform).toMatch(/^matrix\(0\.707\d*, -0\.707/);
    await tap(card());
    await expect(overlay).toHaveCount(0, { timeout: 500 });
    await expect.poll(arrowTransform).toBe("none");

    await tap(card());
    await expect(overlay).toBeVisible();
    await track.dispatchEvent("pointerdown", touch);
    await track.dispatchEvent("pointerup", touch);
    await expect(overlay).toHaveCount(0, { timeout: 500 });

    await tap(card());
    await expect(overlay).toBeVisible();
    await expect(overlay).toHaveCount(0, { timeout: 4_000 });
});

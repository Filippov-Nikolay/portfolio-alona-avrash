import { expect, test } from "@playwright/test";
import { waitForStreamedContent } from "../../helpers/streaming";

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
    await waitForStreamedContent(page);

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

    await client.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: startX, y }],
    });
    const steps = 6;
    for (let step = 1; step <= steps; step++) {
        await page.waitForTimeout(16);
        await client.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: startX + ((endX - startX) * step) / steps, y }],
        });
    }
    const releasePosition = await track.evaluate((element) => element.scrollLeft);
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    await expect
        .poll(
            async () => (await track.evaluate((element) => element.scrollLeft)) - releasePosition,
            {
                timeout: 1_000,
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

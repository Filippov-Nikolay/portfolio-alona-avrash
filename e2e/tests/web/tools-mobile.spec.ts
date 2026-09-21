import { expect, test } from "@playwright/test";

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
    await page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)");
    await section.scrollIntoViewIfNeeded();

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
    await page.waitForTimeout(35);
    await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: (startX + endX) / 2, y }],
    });
    await page.waitForTimeout(35);
    await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: endX, y }],
    });
    const releasePosition = await track.evaluate((element) => element.scrollLeft);
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    await page.waitForTimeout(180);
    const glidedPosition = await track.evaluate((element) => element.scrollLeft);
    expect(glidedPosition - releasePosition).toBeGreaterThan(20);

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

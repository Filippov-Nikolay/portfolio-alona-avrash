import { expect, test } from "../../fixtures/test";

test.beforeEach(async ({ page, context }, testInfo) => {
    test.skip(Boolean(testInfo.project.use.hasTouch), "Desktop pointer behaviour");
    await context.addCookies([
        { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
    ]);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en");

    const section = page.locator("#tools");
    await section.evaluate((element) => {
        const view = element.ownerDocument.defaultView!;
        const absoluteTop = element.getBoundingClientRect().top + view.scrollY;
        view.scrollTo(0, absoluteTop - view.innerHeight * 0.2);
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
});

test("clicking a hovered tool keeps its projects open", async ({ page }) => {
    const section = page.locator("#tools");
    const overlay = section.locator('[data-tools-peek-overlay][data-active="true"]');
    const track = section.locator("[data-tools-track]");
    const box = (await track.boundingBox())!;
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    await page.mouse.move(point.x, point.y);
    await expect(overlay).toBeVisible();
    const pressedUnderCursor = () =>
        page.evaluate(
            ({ x, y }) =>
                document.elementFromPoint(x, y)?.closest("button")?.getAttribute("aria-pressed"),
            point
        );
    await expect.poll(pressedUnderCursor).toBe("true");

    await page.mouse.down();
    await page.mouse.up();

    await page.waitForTimeout(300);
    await expect(overlay).toBeVisible();
    expect(await pressedUnderCursor()).toBe("true");
});

test("dragging the tools track with the mouse still scrolls it", async ({ page }) => {
    const track = page.locator("#tools [data-tools-track]");
    const box = (await track.boundingBox())!;
    const y = box.y + box.height / 2;
    const before = await track.evaluate((element) => element.scrollLeft);

    await page.mouse.move(box.x + box.width * 0.7, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.4, y, { steps: 8 });
    await page.mouse.up();

    expect(
        Math.abs((await track.evaluate((element) => element.scrollLeft)) - before)
    ).toBeGreaterThan(100);
});

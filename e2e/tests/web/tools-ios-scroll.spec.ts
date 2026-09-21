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

test("Tools leaves horizontal swipes to native iOS scrolling", async ({ page }) => {
    await page.goto("/en");

    const section = page.locator("#tools");
    const track = section.locator("[data-tools-track]");
    await expect(track).toBeAttached();
    await page.waitForTimeout(800);

    const initialState = await track.evaluate((element) => {
        const view = element.ownerDocument.defaultView!;
        const style = view.getComputedStyle(element);

        return {
            overflowX: style.overflowX,
            scrollRange: element.scrollWidth - element.clientWidth,
            touchAction: style.touchAction,
        };
    });

    expect(initialState.overflowX).toBe("auto");
    expect(initialState.scrollRange).toBeGreaterThan(1_000);
    expect(initialState.touchAction).toBe("pan-x pan-y");

    const before = await track.evaluate((element) => element.scrollLeft);
    await track.dispatchEvent("pointerdown", {
        pointerId: 7,
        pointerType: "touch",
        clientX: 300,
        clientY: 300,
    });
    await track.dispatchEvent("pointermove", {
        pointerId: 7,
        pointerType: "touch",
        clientX: 100,
        clientY: 300,
    });
    const afterSyntheticMove = await track.evaluate((element) => element.scrollLeft);
    await track.dispatchEvent("pointerup", {
        pointerId: 7,
        pointerType: "touch",
        clientX: 100,
        clientY: 300,
    });

    expect(Math.abs(afterSyntheticMove - before)).toBeLessThanOrEqual(1);
});

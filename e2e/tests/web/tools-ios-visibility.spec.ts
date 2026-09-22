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

test("Tools stays visible after its first reveal on iOS", async ({ page }) => {
    await page.goto("/en");

    const section = page.locator("#tools");
    const track = section.locator("[data-tools-track]");
    await expect(track).toBeAttached();

    const placeSectionAt = async (viewportOffset: number) => {
        await section.evaluate((element, offset) => {
            const view = element.ownerDocument.defaultView!;
            const absoluteTop = element.getBoundingClientRect().top + view.scrollY;
            view.scrollTo(0, absoluteTop - view.innerHeight * offset);
        }, viewportOffset);
        await page.waitForTimeout(350);
    };

    // The first visit starts lazy media above Tools. Reposition against the
    // settled layout before exercising the reveal boundary.
    await placeSectionAt(0.5);
    await placeSectionAt(0.5);
    await placeSectionAt(0.5);
    await page.waitForTimeout(1_100);

    const readVisibility = () =>
        track.evaluate((element) => {
            const style = element.ownerDocument.defaultView!.getComputedStyle(element);
            return { opacity: Number(style.opacity), visibility: style.visibility };
        });

    await expect.poll(async () => (await readVisibility()).opacity).toBeGreaterThan(0.99);

    for (const viewportOffset of [0.9, 0.55, 0.86, 0.58]) {
        await placeSectionAt(viewportOffset);

        const state = await readVisibility();
        expect(state.visibility).toBe("visible");
        expect(state.opacity).toBeGreaterThan(0.99);
    }
});

test("Tools auto-scroll only runs near the section", async ({ page }) => {
    await page.goto("/en");

    const section = page.locator("#tools");
    const track = section.locator("[data-tools-track]");
    await expect(track).toBeAttached();
    await page.waitForTimeout(300);

    const offscreenStart = await track.evaluate((element) => element.scrollLeft);
    await page.waitForTimeout(350);
    const offscreenEnd = await track.evaluate((element) => element.scrollLeft);

    expect(Math.abs(offscreenEnd - offscreenStart)).toBeLessThanOrEqual(1);

    await section.scrollIntoViewIfNeeded();
    await expect
        .poll(async () => track.evaluate((element) => element.scrollLeft), {
            timeout: 2_000,
        })
        .toBeGreaterThan(offscreenEnd + 5);
});

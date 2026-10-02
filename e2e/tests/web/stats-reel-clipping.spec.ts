import { expect, test } from "../../fixtures/test";

test("Digit clipping preserves fractional reel frames without internal scroll containers", async ({
    page,
    context,
}, testInfo) => {
    await context.addCookies([
        { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
    ]);
    await page.goto("/en");
    const camera = page.locator('[class*="statsDepthPlane"]');
    await expect
        .poll(() => camera.evaluate((element) => element.getAnimations()[0]?.playState))
        .toBe("paused");
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1300);
    await page.evaluate(() => {
        const root = document.getElementById("hero-transition-track")!;
        const stage = document.getElementById("hero-sticky-stage")!;
        const track = document.getElementById("stats-camera-track")!;
        scrollTo(
            0,
            root.getBoundingClientRect().top +
                scrollY +
                track.getBoundingClientRect().height -
                stage.getBoundingClientRect().height
        );
    });
    await page.waitForTimeout(350);
    const stat = camera.locator('[data-stat-index="0"]').locator("..");
    // The fractional positions exercise both glyphs at the clip edge. Compare
    // to the previous hidden viewport in the same browser, font and camera pose.
    for (const position of [0, 0.5, 4.25, 9.75, 10]) {
        await camera.evaluate((element, position) => {
            element.querySelectorAll<HTMLElement>("[data-reel-place]").forEach((reel) => {
                reel.style.transform = `translateY(${-position}em)`;
                reel.parentElement!.style.overflow = "hidden";
            });
        }, position);
        const reference = await stat.screenshot();
        await camera.evaluate((element) => {
            element.querySelectorAll<HTMLElement>("[data-reel-place]").forEach((reel) => {
                reel.parentElement!.style.removeProperty("overflow");
            });
        });
        const current = await stat.screenshot();
        expect(current.equals(reference), `reel position ${position}`).toBe(true);
    }
    const scrollers = await camera.evaluate((element) =>
        Array.from(element.querySelectorAll("[data-reel-place]"), (reel) => {
            const viewport = reel.parentElement!;
            viewport.scrollTop = 10;
            return { overflow: getComputedStyle(viewport).overflow, scrollTop: viewport.scrollTop };
        })
    );
    expect(scrollers.length).toBeGreaterThan(0);
    for (const scroller of scrollers) expect(scroller).toEqual({ overflow: "clip", scrollTop: 0 });
});

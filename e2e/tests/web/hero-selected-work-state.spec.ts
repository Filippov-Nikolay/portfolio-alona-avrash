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

test("Selected Work reveal does not update React state during Hero render", async ({ page }) => {
    const renderWarnings: string[] = [];
    page.on("console", (message) => {
        if (message.type() === "error" && message.text().includes("Cannot update a component")) {
            renderWarnings.push(message.text());
        }
    });

    await page.goto("/en");
    await expect(page.locator("#selected-work")).toBeAttached();
    await page.waitForTimeout(500);

    const revealScroll = await page.locator("#hero-transition-track").evaluate((track) => {
        const view = track.ownerDocument.defaultView!;
        const cameraTrack = track.querySelector("#stats-camera-track")!;
        const motionTrack = track.querySelector("#selected-motion-track")!;
        const viewport = track.querySelector("#hero-sticky-stage")!;
        const stageTop = track.getBoundingClientRect().top + view.scrollY;
        const viewportHeight = viewport.getBoundingClientRect().height;
        const start =
            stageTop + Math.max(cameraTrack.getBoundingClientRect().height - viewportHeight, 1);
        const end =
            stageTop + Math.max(motionTrack.getBoundingClientRect().height - viewportHeight, 1);

        return start + (end - start) * 0.4;
    });

    await page.locator("html").evaluate((root, scrollY) => {
        const view = root.ownerDocument.defaultView!;
        view.scrollTo(0, scrollY);
        view.dispatchEvent(new Event("resize"));
    }, revealScroll);

    const viewport = page.viewportSize()!;
    await page.setViewportSize({ width: viewport.width, height: viewport.height - 64 });
    await page.setViewportSize(viewport);
    const selectedHeader = page.locator("#selected-work h2").locator("..");
    await expect
        .poll(async () =>
            Number.parseFloat(
                await selectedHeader.evaluate(
                    (element) =>
                        element.ownerDocument.defaultView!.getComputedStyle(element).opacity
                )
            )
        )
        .toBeGreaterThan(0.95);

    expect(renderWarnings).toEqual([]);
});

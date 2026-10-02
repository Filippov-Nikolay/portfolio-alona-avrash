import { expect, test } from "@playwright/test";

test("project images are ready before the pinned animation enters the viewport", async ({
    page,
}, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.context().addCookies([
        {
            name: "site-preloader",
            value: "1",
            url: String(testInfo.project.use.baseURL),
        },
    ]);
    await page.goto("/en");
    await page.waitForTimeout(1_000);

    const section = page.locator("#projects");
    await section.evaluate((element) => {
        const view = element.ownerDocument.defaultView!;
        const absoluteTop = element.getBoundingClientRect().top + view.scrollY;
        view.scrollTo(0, absoluteTop - view.innerHeight * 1.5);
    });

    const sectionTop = await section.evaluate((element) => element.getBoundingClientRect().top);
    expect(sectionTop).toBeGreaterThan(844);

    const images = section.locator("img");
    await expect.poll(() => images.count()).toBeGreaterThan(0);
    await expect
        .poll(() =>
            images.evaluateAll(
                (elements) =>
                    elements.filter(
                        (image) =>
                            (image as HTMLImageElement).complete &&
                            (image as HTMLImageElement).naturalWidth > 0
                    ).length
            )
        )
        .toBe(await images.count());
});

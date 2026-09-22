import { expect, test, type Locator, type Page } from "@playwright/test";

async function placeSectionAt(page: Page, section: Locator, viewportRatio: number) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
        await section.evaluate((element, ratio) => {
            const view = element.ownerDocument.defaultView!;
            const absoluteTop = element.getBoundingClientRect().top + view.scrollY;
            view.scrollTo(0, absoluteTop - view.innerHeight * ratio);
        }, viewportRatio);
        await page.waitForTimeout(100);
    }
}

test("Reviews reveal stays settled while scrolling around its iPhone threshold", async ({
    page,
}, testInfo) => {
    const baseURL = String(testInfo.project.use.baseURL);
    await page.context().addCookies([
        {
            name: "site-preloader",
            value: "1",
            url: baseURL,
        },
    ]);
    await page.goto("/en");

    const section = page.locator("#reviews");
    const carousel = section.locator("[data-review-carousel]");
    const revealCard = section.locator("[data-review-reveal-card]").first();

    await expect(section).toBeAttached();
    await expect(section).toHaveAttribute("data-review-reveal-ready", "true");
    await placeSectionAt(page, section, 0.5);
    await expect(revealCard).toHaveCSS("opacity", "1");
    await expect(carousel).toHaveCSS("transform", "none");

    for (const ratio of [0.2, 0.72, 0.28, 0.64]) {
        await placeSectionAt(page, section, ratio);
        await page.waitForTimeout(80);
        await expect(revealCard).toHaveCSS("opacity", "1");
        await expect(revealCard).toHaveCSS("transform", "none");
        await expect(carousel).toHaveCSS("transform", "none");
    }
});

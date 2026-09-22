import { expect, test, type Locator, type Page } from "@playwright/test";

const viewports = [
    { name: "mobile", width: 390, height: 844 },
    { name: "tablet", width: 768, height: 1024 },
] as const;

async function placeSectionAt(page: Page, section: Locator, viewportRatio: number) {
    await section.evaluate((element, ratio) => {
        const view = element.ownerDocument.defaultView!;
        const absoluteTop = element.getBoundingClientRect().top + view.scrollY;
        view.scrollTo(0, absoluteTop - view.innerHeight * ratio);
    }, viewportRatio);
    await page.waitForTimeout(100);
}

for (const viewport of viewports) {
    test(`home sections animate after Projects on ${viewport.name}`, async ({ page }, testInfo) => {
        await page.setViewportSize(viewport);
        const baseURL = String(testInfo.project.use.baseURL);
        await page.context().addCookies([
            {
                name: "site-preloader",
                value: "1",
                url: baseURL,
            },
        ]);
        await page.goto("/en");

        const clients = page.locator("#clients");
        const tools = page.locator("#tools");
        const reviews = page.locator("#reviews");
        const cta = page.locator("#cta");
        const firstClientRow = clients.locator("[data-direction]").first();
        const toolsTitle = tools.locator("h2");
        const reviewCarousel = reviews.locator("[data-review-carousel]");
        const firstReviewCard = reviews.locator("[data-review-card]").first();
        const revealReviewCard = reviews.locator("[data-review-reveal-card]").first();
        const ctaTitle = cta.locator("h2");

        await expect(clients).toBeAttached();
        await page.waitForTimeout(500);

        await clients.evaluate((element) => {
            const view = element.ownerDocument.defaultView!;
            const absoluteTop = element.getBoundingClientRect().top + view.scrollY;
            view.scrollTo(0, absoluteTop - view.innerHeight - 100);
        });
        await page.waitForTimeout(250);

        await expect(firstClientRow).not.toHaveCSS("transform", "none");
        await expect(toolsTitle).toHaveCSS("opacity", "0");
        await expect(reviewCarousel).toHaveCSS("opacity", "1");
        await expect(revealReviewCard).toHaveCSS("opacity", "0");
        await expect(firstReviewCard).toHaveCSS("opacity", "1");
        await expect(firstReviewCard).toHaveCSS("transform", "none");
        await expect(ctaTitle).toHaveCSS("opacity", "0");

        await placeSectionAt(page, clients, 0.7);
        await expect
            .poll(async () => firstClientRow.evaluate((element) => element.style.transform))
            .toMatch(/translate(?:3d)?\(0px/);

        await placeSectionAt(page, tools, 0.5);
        await expect(toolsTitle).toHaveCSS("opacity", "1");

        await placeSectionAt(page, reviews, 0.5);
        await expect(revealReviewCard).toHaveCSS("opacity", "1");

        await placeSectionAt(page, cta, 0.65);
        await expect(ctaTitle).toHaveCSS("opacity", "1");
    });
}

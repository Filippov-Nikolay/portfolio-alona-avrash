import { expect, test } from "../../fixtures/test";

for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
]) {
    test(`the CTA sits 120px below the reviews and above the footer on ${viewport.name}`, async ({
        page,
        context,
    }, testInfo) => {
        await context.addCookies([
            { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
        ]);
        await page.setViewportSize(viewport);
        await page.goto("/en");

        const gaps = await page.evaluate(() => {
            const top = (element: Element) => element.getBoundingClientRect().top;
            const bottom = (element: Element) => element.getBoundingClientRect().bottom;
            const reviews = document.getElementById("reviews")!;
            const cards = [...reviews.querySelectorAll("[data-review-card]")];
            const cta = document.getElementById("cta")!.firstElementChild!;
            const footer = document.querySelector("footer")!;
            return {
                reviewsToCta: top(cta) - Math.max(...cards.map(bottom)),
                ctaToFooter: top(footer) - bottom(cta),
            };
        });

        expect(Math.round(gaps.reviewsToCta)).toBe(120);
        expect(Math.round(gaps.ctaToFooter)).toBe(120);
    });
}

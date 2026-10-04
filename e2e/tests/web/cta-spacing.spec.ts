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

        await page.locator("#cta").scrollIntoViewIfNeeded();

        const gaps = await page.evaluate(() => {
            const layoutTop = (element: HTMLElement) => {
                let top = 0;
                for (
                    let node: HTMLElement | null = element;
                    node;
                    node = node.offsetParent as HTMLElement | null
                ) {
                    top += node.offsetTop;
                }
                return top;
            };
            const layoutBottom = (element: HTMLElement) =>
                layoutTop(element) + element.offsetHeight;
            const cards = [
                ...document.querySelectorAll<HTMLElement>("#reviews [data-review-card]"),
            ];
            const cta = document.getElementById("cta")!.firstElementChild as HTMLElement;
            const footer = document.querySelector<HTMLElement>("footer")!;
            return {
                reviewsToCta: layoutTop(cta) - Math.max(...cards.map(layoutBottom)),
                ctaToFooter: layoutTop(footer) - layoutBottom(cta),
            };
        });

        expect(Math.round(gaps.reviewsToCta)).toBe(120);
        expect(Math.round(gaps.ctaToFooter)).toBe(120);
    });
}

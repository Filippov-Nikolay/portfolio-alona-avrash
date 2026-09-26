import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }, testInfo) => {
    await context.addCookies([
        { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
    ]);
});

for (const [from, to] of [
    ["/en", "/en/contact"],
    ["/en/works", "/en/contact"],
    ["/en/contact", "/en"],
] as const) {
    test(`Footer reveals every line after navigating from ${from} to ${to}`, async ({ page }) => {
        test.setTimeout(60_000);
        await page.goto(from);
        await page.waitForTimeout(1500);
        await page
            .locator(`header a[href="${to}"]`)
            .first()
            .evaluate((link: HTMLAnchorElement) => link.click());
        await page.waitForURL((url) => url.pathname === to);
        await page.waitForTimeout(1500);
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForTimeout(600);
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));

        const read = () =>
            page.evaluate(() => {
                const footer = document.querySelector("footer")!;
                const offset = (element: Element) =>
                    Math.round(new DOMMatrixReadOnly(getComputedStyle(element).transform).m42);
                return {
                    masks: Array.from(footer.querySelectorAll("[data-footer-mask]"), offset),
                    chars: Array.from(footer.querySelectorAll("[data-footer-char]"), offset),
                    hiddenChars: Array.from(
                        footer.querySelectorAll("[data-footer-char]"),
                        (char) => getComputedStyle(char).opacity !== "1"
                    ).filter(Boolean).length,
                };
            });
        await expect
            .poll(async () => {
                const state = await read();
                return [...state.masks, ...state.chars].every((y) => y === 0) &&
                    state.hiddenChars === 0
                    ? "revealed"
                    : JSON.stringify(state);
            })
            .toBe("revealed");
        expect((await read()).masks.length).toBeGreaterThan(0);
    });
}

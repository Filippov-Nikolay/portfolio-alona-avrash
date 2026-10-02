import { expect, test } from "../../fixtures/test";

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

test("Footer reveals once across the legal pages", async ({ page }) => {
    test.setTimeout(60_000);
    const hiddenRightAfterScroll = async () => {
        await page.waitForTimeout(1200);
        return page.evaluate(
            () =>
                new Promise<number>((resolve) => {
                    scrollTo(0, document.documentElement.scrollHeight);
                    setTimeout(() => {
                        const chars = document.querySelectorAll("footer [data-footer-char]");
                        resolve(
                            Array.from(chars).filter(
                                (char) => Number(getComputedStyle(char).opacity) < 0.99
                            ).length
                        );
                    }, 150);
                })
        );
    };
    const settled = () =>
        expect
            .poll(() =>
                page.evaluate(() =>
                    Array.from(document.querySelectorAll("footer [data-footer-char]")).every(
                        (char) => getComputedStyle(char).opacity === "1"
                    )
                )
            )
            .toBe(true);
    const clientNavigate = async (selector: string, pathname: string) => {
        await page
            .locator(selector)
            .first()
            .evaluate((link: HTMLAnchorElement) => link.click());
        await page.waitForURL((url) => url.pathname === pathname);
    };

    await page.goto("/en/legal");
    expect(await hiddenRightAfterScroll()).toBeGreaterThan(0);
    await settled();

    await clientNavigate('main a[href="/en/legal/cookies"]', "/en/legal/cookies");
    expect(await hiddenRightAfterScroll()).toBe(0);

    await clientNavigate('nav[aria-label="Breadcrumb"] a[href="/en/legal"]', "/en/legal");
    expect(await hiddenRightAfterScroll()).toBe(0);

    await clientNavigate('header a[href="/en"]', "/en");
    await clientNavigate('footer a[href="/en/legal/privacy"]', "/en/legal/privacy");
    expect(await hiddenRightAfterScroll()).toBe(0);
    await settled();
});

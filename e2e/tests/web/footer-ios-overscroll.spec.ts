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

test("iOS bottom overscroll uses the Footer backdrop without adding page height", async ({
    page,
}) => {
    await page.goto("/en/contact");

    const footer = page.locator("[data-site-footer]");
    await expect(footer).toBeAttached();
    await footer.evaluate((element) => {
        const view = element.ownerDocument.defaultView!;
        view.scrollTo(0, element.ownerDocument.documentElement.scrollHeight);
    });
    await page.waitForTimeout(500);

    const state = await footer.evaluate((element) => {
        const document = element.ownerDocument;
        const view = document.defaultView!;
        const footerBottom = element.getBoundingClientRect().bottom + view.scrollY;
        const rootStyle = view.getComputedStyle(document.documentElement);

        return {
            bottomGap: document.documentElement.scrollHeight - footerBottom,
            footerBackground: view.getComputedStyle(element).backgroundColor,
            rootAttachment: rootStyle.backgroundAttachment,
            rootBackground: rootStyle.backgroundImage,
        };
    });

    expect(Math.abs(state.bottomGap)).toBeLessThanOrEqual(1);
    expect(state.footerBackground).toBe("rgb(234, 253, 39)");
    expect(state.rootAttachment).toBe("fixed");
    expect(state.rootBackground).toContain("rgb(255, 255, 255) 0px");
    expect(state.rootBackground).toContain("rgb(234, 253, 39)");
});

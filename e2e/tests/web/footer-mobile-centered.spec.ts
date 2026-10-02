import { expect, type Locator, type Page } from "../../fixtures/test";
import { test } from "../../fixtures/test";

const VIEWPORT_WIDTH = 390;

// A block is "centered on the screen" here if its own horizontal midpoint
// lands within a couple of pixels of the viewport's midpoint - not just
// "not touching an edge", which a left- or right-aligned block could also
// satisfy by luck given the footer's own horizontal padding.
async function expectCenteredOnScreen(locator: Locator) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();

    const blockMidpoint = box!.x + box!.width / 2;
    expect(Math.abs(blockMidpoint - VIEWPORT_WIDTH / 2)).toBeLessThanOrEqual(2);
}

async function gotoFooter(page: Page, baseURL: string | undefined) {
    await page.context().addCookies([{ name: "site-preloader", value: "1", url: String(baseURL) }]);
    await page.setViewportSize({ width: VIEWPORT_WIDTH, height: 844 });
    await page.goto("/en");
    const footer = page.locator("[data-site-footer]");
    await footer.scrollIntoViewIfNeeded();
    return footer;
}

test("tagline, social icons, copyright and legal links are all centered on mobile", async ({
    page,
}, testInfo) => {
    const footer = await gotoFooter(page, testInfo.project.use.baseURL);

    const tagline = footer.locator("[data-footer-left] p").first();
    const socialRow = footer.locator("[data-footer-social-item]").first().locator("..");
    const copyright = footer.locator("[data-footer-right] p").first();
    const legalList = footer.locator("[data-footer-right] ul");

    await expectCenteredOnScreen(tagline);
    await expectCenteredOnScreen(socialRow);
    await expectCenteredOnScreen(copyright);
    await expectCenteredOnScreen(legalList);
});

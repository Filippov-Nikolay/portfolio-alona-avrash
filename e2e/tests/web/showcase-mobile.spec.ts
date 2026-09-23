import { expect, test } from "@playwright/test";

test("mobile showcase keeps its full tab rule and close button visible while scrolling", async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/works/esencha?tab=gallery");

    const dialog = page.getByRole("dialog", { name: "ESENCHA" });
    await expect(dialog).toBeVisible();

    const tabList = dialog.getByRole("tablist");
    await expect
        .poll(async () => {
            const rule = await tabList.evaluate((element) => ({
                rowWidth: element.getBoundingClientRect().width,
                ruleWidth: Number.parseFloat(
                    element.ownerDocument.defaultView!.getComputedStyle(element, "::after").width
                ),
            }));
            return Math.abs(rule.rowWidth - rule.ruleWidth);
        })
        .toBeLessThanOrEqual(1);

    const closeButton = dialog.getByRole("button", { name: "Close" });
    const beforeScroll = await closeButton.boundingBox();
    expect(beforeScroll).not.toBeNull();

    await dialog.evaluate((element) => {
        type ScrollCandidate = {
            scrollHeight: number;
            clientHeight: number;
            scrollTop: number;
        };
        const candidates = Array.from(element.querySelectorAll("div")) as ScrollCandidate[];
        const scroller = candidates.find(
            (candidate) => candidate.scrollHeight > candidate.clientHeight
        );
        if (!scroller) throw new Error("Showcase scroll container was not found");
        scroller.scrollTop = Math.min(900, scroller.scrollHeight - scroller.clientHeight);
    });

    await expect(closeButton).toBeVisible();
    const afterScroll = await closeButton.boundingBox();
    expect(afterScroll).not.toBeNull();
    expect(Math.abs(afterScroll!.y - beforeScroll!.y)).toBeLessThanOrEqual(1);
});

test("mobile gallery lightbox preserves image geometry while opening and closing", async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/works/esencha?tab=gallery");

    const dialog = page.getByRole("dialog", { name: "ESENCHA" });
    const firstTile = dialog.getByRole("button", { name: /visual 1$/i });
    await expect(firstTile.locator('img:not([aria-hidden="true"])')).toBeVisible();
    const tileImageCount = await firstTile.locator("img").count();

    await firstTile.click();

    const closeButtons = dialog.getByRole("button", { name: "Close" });
    await expect(closeButtons).toHaveCount(2);
    const lightbox = closeButtons.last().locator("..");

    const openingFrame = await lightbox.evaluate((element) => {
        const target = element as unknown as {
            offsetWidth: number;
            parentElement: { clientWidth: number } | null;
            ownerDocument: {
                defaultView: {
                    getComputedStyle: (node: unknown) => {
                        transform: string;
                        willChange: string;
                    };
                } | null;
            };
        };

        const style = target.ownerDocument.defaultView?.getComputedStyle(target);

        return {
            layoutWidth: target.offsetWidth,
            containerWidth: target.parentElement?.clientWidth ?? 0,
            transform: style?.transform ?? "",
            willChange: style?.willChange ?? "",
        };
    });

    expect(openingFrame.layoutWidth).toBeLessThanOrEqual(openingFrame.containerWidth);
    expect(openingFrame.transform).toBe("none");
    expect(openingFrame.willChange).not.toContain("transform");
    expect(openingFrame.willChange).toContain("width");
    expect(openingFrame.willChange).toContain("height");
    expect(await firstTile.locator("img").count()).toBeGreaterThanOrEqual(tileImageCount);
    await expect(firstTile.locator('img:not([aria-hidden="true"])')).toHaveCount(1);

    const containLayer = lightbox.locator('[data-fit-layer="contain"]');
    await expect(containLayer).toHaveCSS("opacity", "1");
    await expect(lightbox.locator('[data-preparing="true"]')).toHaveCount(1);

    await page.waitForTimeout(700);
    await expect(lightbox.locator('[data-fit-layer="contain"]')).toHaveCount(0);
    await expect(lightbox.locator('[data-preparing="true"]')).toHaveCount(0);
    await closeButtons.last().click();

    await page.waitForTimeout(100);
    const closingFrame = await lightbox.evaluate((element) => {
        const view = element.ownerDocument.defaultView;
        if (!view) throw new Error("Gallery lightbox window is unavailable");
        const style = view.getComputedStyle(element);
        const images = Array.from(element.querySelectorAll("img"));
        return {
            transform: style.transform,
            imageFits: images.map((image) => view.getComputedStyle(image).objectFit),
        };
    });

    expect(closingFrame.transform).toBe("none");
    expect(closingFrame.imageFits).toContain("cover");
    expect(closingFrame.imageFits).toContain("contain");
    await expect(closeButtons).toHaveCount(1);
    expect(await firstTile.locator("img").count()).toBeGreaterThanOrEqual(tileImageCount);
    await expect(firstTile.locator('img:not([aria-hidden="true"])')).toHaveCount(1);
});

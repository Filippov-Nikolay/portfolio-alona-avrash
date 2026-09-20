import { expect, test } from "@playwright/test";

test("mobile showcase keeps its full tab rule and close button visible while scrolling", async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/works/esencha?tab=gallery");

    const dialog = page.getByRole("dialog", { name: "ESENCHA" });
    await expect(dialog).toBeVisible();

    const tabList = dialog.getByRole("tablist");
    const rule = await tabList.evaluate((element) => ({
        rowWidth: element.getBoundingClientRect().width,
        ruleWidth: Number.parseFloat(
            element.ownerDocument.defaultView!.getComputedStyle(element, "::after").width
        ),
    }));
    expect(Math.abs(rule.rowWidth - rule.ruleWidth)).toBeLessThanOrEqual(1);

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

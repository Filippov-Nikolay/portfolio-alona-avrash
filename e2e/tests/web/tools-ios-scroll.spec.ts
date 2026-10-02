import { expect, test } from "../../fixtures/test";

test.beforeEach(async ({ context }, testInfo) => {
    await context.addCookies([
        {
            name: "site-preloader",
            value: "1",
            url: String(testInfo.project.use.baseURL),
        },
    ]);
});

test("Tools leaves horizontal swipes to native iOS scrolling", async ({ page }) => {
    await page.goto("/en");

    const section = page.locator("#tools");
    const track = section.locator("[data-tools-track]");
    await expect(track).toBeAttached();
    await page.waitForTimeout(800);

    const initialState = await track.evaluate((element) => {
        const view = element.ownerDocument.defaultView!;
        const style = view.getComputedStyle(element);

        return {
            overflowX: style.overflowX,
            scrollRange: element.scrollWidth - element.clientWidth,
            touchAction: style.touchAction,
        };
    });

    expect(initialState.overflowX).toBe("auto");
    expect(initialState.scrollRange).toBeGreaterThan(1_000);
    expect(initialState.touchAction).toBe("pan-x pan-y");

    await expect
        .poll(async () => track.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(1_000);

    const before = await track.evaluate((element) => element.scrollLeft);
    await track.dispatchEvent("pointerdown", {
        pointerId: 7,
        pointerType: "touch",
        clientX: 300,
        clientY: 300,
    });
    await track.dispatchEvent("pointermove", {
        pointerId: 7,
        pointerType: "touch",
        clientX: 100,
        clientY: 300,
    });
    const afterSyntheticMove = await track.evaluate((element) => element.scrollLeft);
    await track.dispatchEvent("pointerup", {
        pointerId: 7,
        pointerType: "touch",
        clientX: 100,
        clientY: 300,
    });

    expect(Math.abs(afterSyntheticMove - before)).toBeLessThanOrEqual(1);
});

test("Tools recenters an infinite strip only after iOS momentum has settled", async ({ page }) => {
    await page.goto("/en");

    const section = page.locator("#tools");
    const track = section.locator("[data-tools-track]");
    await expect(track).toBeAttached();
    for (let attempt = 0; attempt < 3; attempt += 1) {
        await section.scrollIntoViewIfNeeded();
        await page.waitForTimeout(250);
    }
    await expect(section).toHaveAttribute("data-tools-reveal-complete", "true");

    const loopWidth = await track.evaluate((element) => {
        const marquee = element.firstElementChild;
        const sequence = marquee?.firstElementChild;
        return (sequence as unknown as { offsetWidth: number } | null)?.offsetWidth ?? 0;
    });
    expect(loopWidth).toBeGreaterThan(1_000);

    const edgePosition = loopWidth * 0.6;
    await track.dispatchEvent("pointerdown", {
        pointerId: 11,
        pointerType: "touch",
        clientX: 280,
        clientY: 300,
    });
    await track.evaluate((element, position) => {
        element.scrollLeft = position;
    }, edgePosition);

    // A recenter during the gesture cancels Safari's native momentum and can
    // leave its asynchronously painted scrolling layer blank for a frame.
    await page.waitForTimeout(350);
    await expect
        .poll(async () => track.evaluate((element) => element.scrollLeft))
        .toBeCloseTo(edgePosition, 0);

    await track.dispatchEvent("pointerup", {
        pointerId: 11,
        pointerType: "touch",
        clientX: 120,
        clientY: 300,
    });

    await expect
        .poll(async () => track.evaluate((element) => element.scrollLeft), {
            timeout: 2_500,
        })
        .toBeGreaterThan(loopWidth * 2);

    const settledPosition = await track.evaluate((element) => element.scrollLeft);
    expect(settledPosition).toBeLessThan(loopWidth * 3);
    expect(settledPosition % loopWidth).toBeCloseTo(edgePosition % loopWidth, 0);

    const paintedCards = await track.locator("button").evaluateAll((cards) => {
        const trackRect =
            cards[0]?.parentElement?.parentElement?.parentElement?.getBoundingClientRect();
        if (!trackRect) return 0;

        return cards.filter((card) => {
            const rect = card.getBoundingClientRect();
            const style = card.ownerDocument.defaultView!.getComputedStyle(card);
            return (
                rect.right > trackRect.left &&
                rect.left < trackRect.right &&
                rect.width > 0 &&
                rect.height > 0 &&
                style.visibility === "visible"
            );
        }).length;
    });
    expect(paintedCards).toBeGreaterThan(0);

    // Lazy media above Tools can still settle in dev mode. Keep the strip in
    // view before checking its autonomous boundary crossing.
    for (let attempt = 0; attempt < 3; attempt += 1) {
        await section.scrollIntoViewIfNeeded();
        await page.waitForTimeout(250);
    }

    await track.evaluate(
        (element, position) => {
            element.scrollLeft = position;
        },
        loopWidth * 3 - 5
    );

    await expect
        .poll(
            async () => {
                const position = await track.evaluate((element) => element.scrollLeft);
                return position >= loopWidth * 2 && position < loopWidth * 2 + 150;
            },
            { timeout: 3_500 }
        )
        .toBe(true);
});

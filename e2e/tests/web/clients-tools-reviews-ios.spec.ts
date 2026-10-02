import { expect, test, type Locator, type Page } from "@playwright/test";
import { waitForStreamedContent } from "../../helpers/streaming";

async function placeSectionAt(page: Page, section: Locator, viewportRatio: number) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
        await section.evaluate((element, ratio) => {
            const view = element.ownerDocument.defaultView!;
            const absoluteTop = element.getBoundingClientRect().top + view.scrollY;
            view.scrollTo(0, absoluteTop - view.innerHeight * ratio);
        }, viewportRatio);
        await page.waitForTimeout(100);
    }
}

async function expectVisiblePillsToStayOpaque(clients: Locator) {
    const geometry = await clients.evaluate((section) => {
        type MeasurableNode = {
            ownerDocument: {
                documentElement: { clientWidth: number };
                defaultView: {
                    getComputedStyle: (node: MeasurableNode) => {
                        opacity: string;
                        visibility: string;
                    };
                };
            };
            querySelectorAll: (selector: string) => ArrayLike<MeasurableNode>;
            closest: (selector: string) => MeasurableNode | null;
            dataset: Record<string, string | undefined>;
            getBoundingClientRect: () => {
                left: number;
                right: number;
                width: number;
                height: number;
            };
            textContent: string | null;
        };
        const root = section as unknown as MeasurableNode;
        const viewportWidth = root.ownerDocument.documentElement.clientWidth;
        const visiblePills = Array.from(root.querySelectorAll("[data-client-pill]"))
            .map((pill) => {
                const rect = pill.getBoundingClientRect();
                const row = pill.closest("[data-direction]");
                const rowRect = row?.getBoundingClientRect();
                const style = root.ownerDocument.defaultView.getComputedStyle(pill);
                return {
                    name: pill.textContent?.trim() || "spacer",
                    direction: row?.dataset.direction,
                    left: rect.left,
                    right: rect.right,
                    opacity: Number(style.opacity),
                    visibility: style.visibility,
                    clipLeft: Math.max(0, rowRect?.left ?? 0),
                    clipRight: Math.min(viewportWidth, rowRect?.right ?? viewportWidth),
                };
            })
            .filter(
                ({ left, right, clipLeft, clipRight }) =>
                    clipRight > clipLeft && right > clipLeft && left < clipRight
            );

        return {
            revealing: root.dataset.clientsRevealing === "true",
            visibleCount: visiblePills.length,
            faded: visiblePills.filter(
                ({ opacity, visibility }) => visibility === "hidden" || opacity < 0.999
            ),
        };
    });

    if (geometry.revealing) {
        expect(geometry.faded).toEqual([]);
    }
    return geometry;
}

test.beforeEach(async ({ context }, testInfo) => {
    await context.addCookies([
        {
            name: "site-preloader",
            value: "1",
            url: String(testInfo.project.use.baseURL),
        },
    ]);
});

test("Clients, Tools and Reviews remain stable through repeated iOS scrolling", async ({
    page,
    hasTouch,
}) => {
    test.skip(!hasTouch, "asserts the compact touch reveal used by Tools and Reviews");
    await page.goto("/en");
    await waitForStreamedContent(page);

    const clients = page.locator("#clients");
    const clientRows = clients.locator("[data-clients-reveal-row]");
    const clientTracks = clients.locator("[data-clients-marquee]");
    const tools = page.locator("#tools");
    const toolsTrack = tools.locator("[data-tools-track]");
    const toolsRevealCard = tools.locator("[data-tools-reveal-card]").first();
    const reviews = page.locator("#reviews");
    const reviewRevealCard = reviews.locator("[data-review-reveal-card]").first();

    await expect(clients).toHaveAttribute("data-clients-reveal-ready", "true");
    await expect(tools).toHaveAttribute("data-tools-reveal-ready", "true");
    await expect(reviews).toHaveAttribute("data-review-reveal-ready", "true");

    const initialClientLayers = await clientTracks.evaluateAll((tracks) =>
        tracks.map((track) => {
            const style = track.ownerDocument.defaultView!.getComputedStyle(track);
            return { animationName: style.animationName, willChange: style.willChange };
        })
    );
    expect(initialClientLayers).toEqual([
        { animationName: "none", willChange: "auto" },
        { animationName: "none", willChange: "auto" },
    ]);

    await placeSectionAt(page, clients, 0.6);
    await expect(clientRows.first()).toHaveCSS("transform", "none", { timeout: 10_000 });
    await expect(clients).toHaveAttribute("data-clients-marquee-running", "true");
    await expect(clients).not.toHaveAttribute("data-clients-revealing", "true");

    const clientPositionsBefore = await clientTracks.evaluateAll((tracks) =>
        tracks.map((track) => track.ownerDocument.defaultView!.getComputedStyle(track).transform)
    );
    await page.waitForTimeout(300);
    const clientPositionsAfter = await clientTracks.evaluateAll((tracks) =>
        tracks.map((track) => track.ownerDocument.defaultView!.getComputedStyle(track).transform)
    );
    expect(clientPositionsAfter).not.toEqual(clientPositionsBefore);

    await placeSectionAt(page, tools, 0.72);
    await expect(tools).toHaveAttribute("data-tools-reveal-complete", "true");
    await expect(toolsRevealCard).toHaveCSS("opacity", "1");
    await expect(toolsTrack).toHaveCSS("opacity", "1");
    await expect(toolsTrack).toHaveCSS("transform", "none");

    const sectionHeights: number[] = await Promise.all(
        [clients, tools, reviews].map((section) =>
            section.evaluate((element) => element.getBoundingClientRect().height)
        )
    );
    const scrollLeftBefore = await toolsTrack.evaluate((track) => track.scrollLeft);

    await page.evaluate(`(async () => {
        for (let frame = 0; frame < 40; frame += 1) {
            window.scrollBy(0, 2);
            await new Promise(requestAnimationFrame);
        }
    })()`);

    const scrollLeftDuringPageScroll = await toolsTrack.evaluate((track) => track.scrollLeft);
    expect(Math.abs(scrollLeftDuringPageScroll - scrollLeftBefore)).toBeLessThanOrEqual(4);

    await page.waitForTimeout(400);
    const scrollLeftAfterIdle = await toolsTrack.evaluate((track) => track.scrollLeft);
    expect(scrollLeftAfterIdle).toBeGreaterThan(scrollLeftDuringPageScroll + 5);

    for (const ratio of [0.82, 0.58, 0.78, 0.62]) {
        await placeSectionAt(page, tools, ratio);
        await expect(toolsRevealCard).toHaveCSS("opacity", "1");
        await expect(toolsTrack).toHaveCSS("transform", "none");
    }

    await placeSectionAt(page, reviews, 0.5);
    await expect(reviewRevealCard).toHaveCSS("opacity", "1");
    await expect(reviewRevealCard).toHaveCSS("transform", "none");
    await expect(clients).toHaveAttribute("data-clients-marquee-running", "false");

    const settledClientLayers = await clientTracks.evaluateAll((tracks) =>
        tracks.map((track) => {
            const style = track.ownerDocument.defaultView!.getComputedStyle(track);
            return { animationName: style.animationName, willChange: style.willChange };
        })
    );
    expect(settledClientLayers).toEqual([
        { animationName: "none", willChange: "auto" },
        { animationName: "none", willChange: "auto" },
    ]);

    const settledHeights: number[] = await Promise.all(
        [clients, tools, reviews].map((section) =>
            section.evaluate((element) => element.getBoundingClientRect().height)
        )
    );
    settledHeights.forEach((height, index) => {
        expect(Math.abs(height - sectionHeights[index]!)).toBeLessThanOrEqual(1);
    });
});

test("Clients rows slide in without fading while the marquee keeps moving", async ({ page }) => {
    for (const width of [243, 390, 820, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/en");
        await waitForStreamedContent(page);

        const clients = page.locator("#clients");
        const rows = clients.locator("[data-direction]");
        const revealRows = clients.locator("[data-clients-reveal-row]");
        const tracks = clients.locator("[data-clients-marquee]");
        await expect(clients).toHaveAttribute("data-clients-reveal-ready", "true");
        await expect(clients).toHaveAttribute("data-clients-revealing", "true");

        await placeSectionAt(page, clients, 0.75);

        await expect(rows).toHaveCount(2);
        await expect(revealRows).toHaveCount(2);
        await expect(rows.first()).toHaveCSS("overflow-x", "hidden");
        await expect(revealRows.first()).toHaveCSS("overflow-x", "visible");

        let sawVisiblePill = false;
        for (let sample = 0; sample < 20; sample += 1) {
            const revealing = await clients.getAttribute("data-clients-revealing");
            if (revealing !== "true") break;

            const revealState = await expectVisiblePillsToStayOpaque(clients);
            if (!revealState.revealing) break;

            const visiblePillCount = revealState.visibleCount;
            if (sawVisiblePill) {
                expect(
                    visiblePillCount,
                    `Clients reveal became empty again at ${width}px`
                ).toBeGreaterThan(0);
            }
            sawVisiblePill ||= visiblePillCount > 0;
            await page.waitForTimeout(50);
        }

        expect(sawVisiblePill, `No pill appeared during reveal at ${width}px`).toBe(true);
        await expect(clients).not.toHaveAttribute("data-clients-revealing", "true");
        await expect(revealRows.first()).toHaveCSS("transform", "none");
        await expect(clients).toHaveAttribute("data-clients-marquee-running", "true");
        await expect(tracks).toHaveCount(2);
        await expect(clients.locator("[data-clients-sequence]")).toHaveCount(12);

        const before = await tracks.evaluateAll((elements) =>
            elements.map(
                (track) => track.ownerDocument.defaultView!.getComputedStyle(track).transform
            )
        );
        await page.waitForTimeout(200);
        const after = await tracks.evaluateAll((elements) =>
            elements.map(
                (track) => track.ownerDocument.defaultView!.getComputedStyle(track).transform
            )
        );
        expect(after).not.toEqual(before);
    }
});

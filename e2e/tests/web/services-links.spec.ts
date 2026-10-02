import { expect, test } from "@playwright/test";
import { waitForStreamedContent } from "../../helpers/streaming";

interface CapturedBeacon {
    eventName: string;
    entityId?: string;
}

const expectedFilters = ["ui-ux", "branding", "logo", "packaging", "web-design"];

test.beforeEach(async ({ context }, testInfo) => {
    await context.addCookies([
        { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
    ]);
});

test("every Services card links to its filtered Works category", async ({ page }) => {
    await page.goto("/en");
    await waitForStreamedContent(page);

    const links = page.locator("[data-service-link]");
    await expect(links).toHaveCount(expectedFilters.length);

    const hrefs = await links.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("href"))
    );
    expect(hrefs).toEqual(expectedFilters.map((filter) => `/en/works?filter=${filter}`));
});

test("a Services category click is tracked and opens the matching filtered catalog", async ({
    page,
}) => {
    const beacons: CapturedBeacon[] = [];
    await page.route("https://analytics.e2e.test/event", async (route) => {
        beacons.push(JSON.parse(route.request().postData() ?? "{}") as CapturedBeacon);
        await route.fulfill({ status: 204, body: "" });
    });
    await page.goto("/en");
    await waitForStreamedContent(page);

    const uiUxCard = page.locator('[data-service-card="ui-ux"]');
    const uiUxLink = page.locator('[data-service-link="ui-ux"]');
    await page.waitForTimeout(1_200);
    await uiUxCard.evaluate((card) => {
        const view = card.ownerDocument.defaultView!;
        const viewportHeight = view.innerHeight;
        const headerHeight =
            card.ownerDocument.querySelector("header")?.getBoundingClientRect().height ?? 96;
        const entryEnd = Math.max(headerHeight, 72);
        const entryStart = viewportHeight * 0.82;
        const bandHeight = headerHeight + 20;
        let lower = entryEnd;
        let upper = entryStart;

        for (let index = 0; index < 24; index += 1) {
            const offset = (lower + upper) / 2;
            const progress = Math.min(
                Math.max((entryStart - offset) / Math.max(entryStart - entryEnd, 1), 0),
                1
            );
            const easedProgress = progress * progress * (3 - 2 * progress);

            if (offset > easedProgress * bandHeight) upper = offset;
            else lower = offset;
        }

        const contactOffset = (lower + upper) / 2 - 42;
        const revealDistance = Math.min(520, Math.max(320, viewportHeight * 0.45));
        const grid = card.parentElement!;
        const gridTop = grid.getBoundingClientRect().top + view.scrollY;

        view.scrollTo(0, gridTop - contactOffset + revealDistance + 8);
        view.dispatchEvent(new Event("scroll"));
    });
    await expect
        .poll(async () => uiUxCard.evaluate((card) => (card as HTMLElement).inert))
        .toBe(false);
    await expect(uiUxCard).toHaveCSS("pointer-events", "auto");
    await uiUxLink.hover();
    await expect(uiUxLink.locator("[data-service-approach]")).toHaveCSS("opacity", "0.7");
    await uiUxLink.click();

    await expect(page).toHaveURL(/\/en\/works\?filter=ui-ux$/);
    await expect(page.getByRole("radio", { name: "UI\/UX", exact: true })).toHaveAttribute(
        "aria-checked",
        "true"
    );
    await expect(page.getByTestId("works-card").first()).toBeVisible();
    await expect
        .poll(() =>
            beacons.some(
                (beacon) => beacon.eventName === "works_filter" && beacon.entityId === "ui-ux"
            )
        )
        .toBe(true);
});

test("desktop Services follows scroll without a trailing animation loop", async ({ page }) => {
    await page.goto("/en");
    await waitForStreamedContent(page);
    await page.waitForTimeout(1_200);

    const secondCard = page.locator("#services article").nth(1);
    const expectedOpacity = await secondCard.evaluate((card) => {
        const view = card.ownerDocument.defaultView!;
        const runway = card.previousElementSibling!;
        const revealDistance = Math.min(520, Math.max(320, view.innerHeight * 0.45));
        const revealStart =
            runway.getBoundingClientRect().bottom +
            view.scrollY -
            Number.parseFloat(view.getComputedStyle(card).top) -
            revealDistance;
        const progress = 0.4;

        view.scrollTo(0, revealStart + revealDistance * progress);
        view.dispatchEvent(new Event("scroll"));
        return progress * progress * (3 - 2 * progress);
    });

    await page
        .locator("html")
        .evaluate(
            (root) =>
                new Promise<void>((resolve) =>
                    root.ownerDocument.defaultView!.requestAnimationFrame(() => resolve())
                )
        );
    const actualOpacity = Number.parseFloat(
        await secondCard.evaluate((card) => card.style.opacity)
    );

    expect(Math.abs(actualOpacity - expectedOpacity)).toBeLessThan(0.01);
});

test("desktop Services retires old layers after the third card reveal", async ({ page }) => {
    await page.goto("/en");
    await waitForStreamedContent(page);
    await page.waitForTimeout(1_200);

    const cards = page.locator("#services article");
    const thirdCard = cards.nth(2);
    await thirdCard.evaluate((card) => {
        const view = card.ownerDocument.defaultView!;
        const runway = card.previousElementSibling!;
        const revealDistance = Math.min(520, Math.max(320, view.innerHeight * 0.45));
        const revealStart =
            runway.getBoundingClientRect().bottom +
            view.scrollY -
            Number.parseFloat(view.getComputedStyle(card).top) -
            revealDistance;

        view.scrollTo(0, revealStart + revealDistance + 1);
        view.dispatchEvent(new Event("scroll"));
    });
    await page
        .locator("html")
        .evaluate(
            (root) =>
                new Promise<void>((resolve) =>
                    root.ownerDocument.defaultView!.requestAnimationFrame(() => resolve())
                )
        );

    await expect(cards.first()).toHaveCSS("visibility", "hidden");
    await expect(cards.first()).toHaveCSS("will-change", "auto");
    await expect(thirdCard).toHaveCSS("visibility", "visible");
    await expect(thirdCard).toHaveCSS("will-change", "transform, opacity");
});

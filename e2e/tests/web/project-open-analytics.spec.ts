import { expect, test } from "../../fixtures/test";

interface CapturedBeacon {
    eventName: string;
    entityId?: string;
    path: string;
}

test("project_open beacon reports the project's own path, not the catalog's", async ({ page }) => {
    const beacons: CapturedBeacon[] = [];

    await page.route("https://analytics.e2e.test/event", async (route) => {
        beacons.push(JSON.parse(route.request().postData() ?? "{}") as CapturedBeacon);
        await route.fulfill({ status: 204, body: "" });
    });

    await page.goto("/en/works");

    const firstCard = page.getByTestId("works-card").first();
    await firstCard.click();

    await expect.poll(() => beacons.some((b) => b.eventName === "project_open")).toBe(true);

    const beacon = beacons.find((b) => b.eventName === "project_open")!;
    expect(beacon.path).toMatch(/^\/en\/works\/[^/]+$/);
    expect(beacon.path).not.toBe("/en/works");
});

test("directly opening a project's URL also reports a project_open beacon", async ({ page }) => {
    // WorksCard has no real <a href> to a project (it opens the modal via
    // plain state), so the only reliable way to get a real slug is to let
    // the catalog itself derive one, the same way a user would.
    await page.goto("/en/works");
    await page.getByTestId("works-card").first().click();
    await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/en\/works\/[^/]+$/);
    const projectUrl = page.url();

    // The click above already sent its own project_open beacon and marked
    // this project's dedupe key in sessionStorage, which survives a same-tab
    // navigation - clear it so the direct nav below gets a fair, undeduped
    // check, same as a visitor arriving fresh from a shared link would.
    await page.evaluate("sessionStorage.clear()");

    const beacons: CapturedBeacon[] = [];
    await page.route("https://analytics.e2e.test/event", async (route) => {
        beacons.push(JSON.parse(route.request().postData() ?? "{}") as CapturedBeacon);
        await route.fulfill({ status: 204, body: "" });
    });

    // A hard navigation - the case that fired zero project_open beacons
    // before this fix, since WorksCatalog only ever called trackEvent from
    // the click handler that opens the modal, never from the
    // initialSelectedId path a fresh page load takes.
    await page.goto(projectUrl);

    await expect.poll(() => beacons.some((b) => b.eventName === "project_open")).toBe(true);
    const beacon = beacons.find((b) => b.eventName === "project_open")!;
    expect(beacon.path).toBe(new URL(projectUrl).pathname);
});

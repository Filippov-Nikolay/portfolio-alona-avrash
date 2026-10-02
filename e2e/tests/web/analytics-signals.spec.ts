import { expect, test } from "@playwright/test";

interface CapturedBeacon {
    eventName: string;
    entityId?: string;
    path: string;
}

async function captureBeacons(page: import("@playwright/test").Page): Promise<CapturedBeacon[]> {
    const beacons: CapturedBeacon[] = [];
    await page.route("https://analytics.e2e.test/event", async (route) => {
        beacons.push(JSON.parse(route.request().postData() ?? "{}") as CapturedBeacon);
        await route.fulfill({ status: 204, body: "" });
    });
    return beacons;
}

test("choosing a category filter fires works_filter, clearing it does not", async ({ page }) => {
    const beacons = await captureBeacons(page);

    await page.goto("/en/works");
    const filterGroup = page.getByRole("radiogroup", { name: "Sort by" });
    // Index 0 is the "All" clear-filters pill - the first real category
    // starts at 1.
    const firstCategory = filterGroup.getByRole("radio").nth(1);
    await expect(firstCategory).toHaveAttribute("aria-checked", "false");

    await firstCategory.click();
    await expect.poll(() => beacons.some((b) => b.eventName === "works_filter")).toBe(true);
    const filterBeacon = beacons.find((b) => b.eventName === "works_filter")!;
    expect(filterBeacon.entityId).toBeTruthy();

    // Picking the same category again within the dedupe window is a repeat,
    // not a new signal - trackEvent()'s own session dedupe is what enforces
    // this now (WorksCatalog no longer has its own pre-check).
    beacons.length = 0;
    await firstCategory.click();
    await page.waitForTimeout(300);
    expect(beacons.some((b) => b.eventName === "works_filter")).toBe(false);

    // Clearing back to "All" isn't interest in a category either.
    await filterGroup.getByRole("radio", { name: "All", exact: true }).click();
    await page.waitForTimeout(300);
    expect(beacons.some((b) => b.eventName === "works_filter")).toBe(false);
});

test("switching to the Gallery tab fires project_gallery_view", async ({ page }) => {
    const beacons = await captureBeacons(page);

    await page.goto("/en/works/esencha");
    await page.getByRole("tab", { name: "Gallery" }).click();

    await expect.poll(() => beacons.some((b) => b.eventName === "project_gallery_view")).toBe(true);
    const beacon = beacons.find((b) => b.eventName === "project_gallery_view")!;
    expect(beacon.entityId).toBeTruthy();
});

test("focusing a real contact field fires contact_started exactly once", async ({ page }) => {
    const beacons = await captureBeacons(page);

    await page.goto("/en/contact");
    await page.getByLabel("Name").focus();
    await page.getByLabel("Email").focus();

    await expect
        .poll(() => beacons.filter((b) => b.eventName === "contact_started").length)
        .toBe(1);
});

test("focusing the honeypot alone does not count as starting the form", async ({ page }) => {
    const beacons = await captureBeacons(page);

    await page.goto("/en/contact");
    // Only a bot would ever reach this field - tabIndex={-1} excludes it from
    // real keyboard navigation, so this simulates exactly that.
    await page.locator("#contact-company").evaluate((el) => el.focus());
    await page.waitForTimeout(300);
    expect(beacons.some((b) => b.eventName === "contact_started")).toBe(false);

    // A real field focused afterward must still fire it - the honeypot must
    // not have silently consumed the "already started" guard.
    await page.getByLabel("Name").focus();
    await expect
        .poll(() => beacons.filter((b) => b.eventName === "contact_started").length)
        .toBe(1);
});

test("every page reached fires page_view once with its own path", async ({
    page,
    context,
}, testInfo) => {
    await context.addCookies([
        { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
    ]);
    const beacons = await captureBeacons(page);

    await page.goto("/en");
    await expect
        .poll(() => beacons.filter((b) => b.eventName === "page_view").map((b) => b.path))
        .toEqual(["/en"]);

    await page
        .locator('header a[href="/en/works"]')
        .first()
        .evaluate((link: HTMLAnchorElement) => link.click());
    await page.waitForURL("**/en/works");
    await expect
        .poll(() => beacons.filter((b) => b.eventName === "page_view").map((b) => b.path))
        .toEqual(["/en", "/en/works"]);

    await page.waitForTimeout(500);
    expect(beacons.filter((b) => b.eventName === "page_view")).toHaveLength(2);
});

test("opening a project straight on its gallery fires project_gallery_view", async ({ page }) => {
    const beacons = await captureBeacons(page);

    await page.goto("/en/works/esencha?tab=gallery");
    await expect(page.getByRole("dialog", { name: "ESENCHA" })).toBeVisible();

    await expect.poll(() => beacons.some((b) => b.eventName === "project_gallery_view")).toBe(true);
    expect(beacons.find((b) => b.eventName === "project_gallery_view")!.entityId).toBeTruthy();
});

test("a Hero social link fires social_click", async ({ page, context }, testInfo) => {
    await context.addCookies([
        { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
    ]);
    const beacons = await captureBeacons(page);

    await page.goto("/en");
    const link = page.locator("#hero a[target='_blank']").first();
    await expect(link).toBeVisible();
    await link.evaluate((element: HTMLAnchorElement) => {
        element.addEventListener("click", (event) => event.preventDefault(), { once: true });
        element.click();
    });

    await expect.poll(() => beacons.some((b) => b.eventName === "social_click")).toBe(true);
    expect(beacons.find((b) => b.eventName === "social_click")!.entityId).toBeTruthy();
});

test("a CV download falls back to the uploaded language and reports it", async ({
    page,
    context,
}, testInfo) => {
    await context.addCookies([
        { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
    ]);
    await page.setViewportSize({ width: 1280, height: 800 });
    const beacons = await captureBeacons(page);

    await page.goto("/pl");
    const link = page.locator("header").getByRole("link", { name: "Pobierz CV" }).first();
    await expect(link).toHaveAttribute("href", "/api/cv/pl");
    const download = page.waitForEvent("download");
    await link.click();

    expect((await download).suggestedFilename()).toBe("e2e-cv.pdf");
    await expect
        .poll(() => beacons.find((b) => b.eventName === "cv_download")?.entityId)
        .toBe("en");
});

import { expect, test, type Page } from "@playwright/test";
import { CONSENT_STORAGE_KEY } from "../../fixtures/consent";

test.use({ storageState: { cookies: [], origins: [] } });

interface CapturedBeacon {
    eventName: string;
    path: string;
    utm?: Record<string, string>;
}

async function captureBeacons(page: Page): Promise<CapturedBeacon[]> {
    const beacons: CapturedBeacon[] = [];
    await page.route("https://analytics.e2e.test/event", async (route) => {
        beacons.push(JSON.parse(route.request().postData() ?? "{}") as CapturedBeacon);
        await route.fulfill({ status: 204, body: "" });
    });
    return beacons;
}

test.beforeEach(async ({ context }, testInfo) => {
    await context.addCookies([
        { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
    ]);
});

const storedConsent = (page: Page) =>
    page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as { preferences: boolean; analytics: boolean }) : null;
    }, CONSENT_STORAGE_KEY);

const hasVercelScript = (page: Page) =>
    page.evaluate(() => document.querySelector('script[src*="vercel"]') !== null);

test("a new visitor sees the banner and nothing is measured before a choice", async ({ page }) => {
    const beacons = await captureBeacons(page);
    await page.goto("/en");

    const banner = page.getByRole("region", { name: "Privacy preferences" });
    await expect(banner).toBeVisible();
    await page.waitForTimeout(1200);

    expect(beacons).toEqual([]);
    expect(await hasVercelScript(page)).toBe(false);
    expect(await storedConsent(page)).toBeNull();
    expect(
        await page.evaluate(() => sessionStorage.getItem("avrash_analytics_session"))
    ).toBeNull();
});

test("accepting starts measurement at once and is remembered", async ({ page }) => {
    const beacons = await captureBeacons(page);
    await page.goto("/en");

    await page.getByRole("button", { name: "Accept optional" }).click();
    await expect(page.getByRole("region", { name: "Privacy preferences" })).toBeHidden();
    await expect
        .poll(() => beacons.filter((b) => b.eventName === "page_view").map((b) => b.path))
        .toEqual(["/en"]);
    await expect.poll(() => hasVercelScript(page)).toBe(true);
    expect(await storedConsent(page)).toMatchObject({ preferences: true, analytics: true });

    await page.reload();
    await page.waitForTimeout(800);
    await expect(page.getByRole("region", { name: "Privacy preferences" })).toHaveCount(0);
});

test("a campaign landing is attributed even when consent comes after navigating", async ({
    page,
}) => {
    const beacons = await captureBeacons(page);
    await page.goto("/en?utm_source=instagram&utm_campaign=autumn&utm_term=ignored&fbclid=x");

    await page
        .locator('header a[href="/en/works"]')
        .first()
        .evaluate((link: HTMLAnchorElement) => link.click());
    await page.waitForURL("**/en/works");
    await page.getByRole("button", { name: "Accept optional" }).click();

    await expect.poll(() => beacons.filter((b) => b.eventName === "page_view").length).toBe(1);
    expect(beacons[0]).toMatchObject({
        path: "/en/works",
        utm: { source: "instagram", campaign: "autumn" },
    });
    expect(Object.keys(beacons[0]!.utm!)).toEqual(["source", "campaign"]);

    await page
        .locator('header a[href="/en/contact"]')
        .first()
        .evaluate((link: HTMLAnchorElement) => link.click());
    await expect.poll(() => beacons.filter((b) => b.eventName === "page_view").length).toBe(2);
    expect(beacons.at(-1)).not.toHaveProperty("utm");
});

test("rejecting keeps analytics off and does not persist the theme", async ({ page }) => {
    const beacons = await captureBeacons(page);
    await page.goto("/en");

    await page.getByRole("button", { name: "Reject optional" }).click();
    await expect(page.getByRole("region", { name: "Privacy preferences" })).toBeHidden();
    expect(await storedConsent(page)).toMatchObject({ preferences: false, analytics: false });

    await page
        .locator('header a[href="/en/works"]')
        .first()
        .evaluate((link: HTMLAnchorElement) => link.click());
    await page.waitForURL("**/en/works");
    await page.waitForTimeout(800);
    expect(beacons).toEqual([]);

    await page.evaluate(() => {
        const toggle = document.querySelector<HTMLButtonElement>(
            'button[aria-label*="theme" i], button[aria-label*="mode" i]'
        );
        toggle?.click();
    });
    await page.waitForTimeout(600);
    const persisted = await page.evaluate(() => ({
        local: localStorage.getItem("site-theme"),
        cookie: document.cookie.includes("site-theme="),
    }));
    expect(persisted).toEqual({ local: null, cookie: false });
});

test("cookie settings in the footer allow analytics without preferences", async ({ page }) => {
    const beacons = await captureBeacons(page);
    await page.goto("/en/contact");
    await page.getByRole("button", { name: "Reject optional" }).click();

    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    const settings = page.getByRole("button", { name: "Cookie settings" });
    await expect(settings).toBeVisible({ timeout: 10_000 });
    await settings.click();
    const panel = page.getByRole("dialog", { name: "Privacy preferences" });
    await expect(panel).toBeVisible();
    await panel.getByRole("checkbox").nth(1).check();
    await panel.getByRole("button", { name: "Save preferences" }).click();
    await expect(panel).toBeHidden();

    expect(await storedConsent(page)).toMatchObject({ preferences: false, analytics: true });
    await expect.poll(() => beacons.some((b) => b.eventName === "page_view")).toBe(true);
});

test("legal pages render and the cookie policy opens the preferences panel", async ({ page }) => {
    for (const [path, title] of [
        ["/en/legal/privacy", "Privacy Policy"],
        ["/en/legal/terms", "Terms of Use"],
        ["/en/legal/cookies", "Cookie & Browser Storage Policy"],
    ] as const) {
        const response = await page.goto(path);
        expect(response?.status()).toBe(200);
        await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    }

    await page.getByRole("button", { name: "Reject optional" }).click();
    await page
        .locator("main")
        .getByRole("button", { name: "Manage preferences" })
        .evaluate((button: HTMLElement) => button.click());
    await expect(page.getByRole("dialog", { name: "Privacy preferences" })).toBeVisible();
});

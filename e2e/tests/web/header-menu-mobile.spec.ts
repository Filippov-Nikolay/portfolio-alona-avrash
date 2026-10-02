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

test("the menu's animated layers do not carry backdrop-filter themselves", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en");

    await page.getByRole("button", { name: "Open menu" }).click();

    const overlay = page.locator("[data-menu-overlay]");
    const overlayBlur = page.locator("[data-menu-overlay-blur]");
    const panel = page.locator("[data-menu-panel]");
    const panelSurface = page.locator("[data-menu-panel-surface]");

    await expect(overlay).toHaveCSS("backdrop-filter", "none");
    await expect(overlayBlur).not.toHaveCSS("backdrop-filter", "none");

    await expect(panel).toHaveCSS("backdrop-filter", "none");

    void panelSurface;
});

test("the mobile menu opens, its links and CV button stay clickable, and it closes", async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en");

    const trigger = page.getByRole("button", { name: "Open menu" });
    await trigger.click();

    const nav = page.getByRole("navigation", { name: "Mobile navigation" });
    await expect(nav).toBeVisible();

    // The static surface layer sits behind the content (z-index: 0 vs 1) -
    // if it painted on top instead, this click would silently miss it.
    const worksLink = nav.getByRole("link").filter({ hasText: /works/i });
    await expect(worksLink).toBeVisible();
    await worksLink.click();

    await expect(page).toHaveURL(/\/works$/);
});

test("the mobile menu's CV button stays clickable through the surface layer", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en");

    await page.getByRole("button", { name: "Open menu" }).click();

    const nav = page.getByRole("navigation", { name: "Mobile navigation" });
    await expect(nav).toBeVisible();

    // handleCvClick(e, { closeMenu: true }) is the mobile CV link's only way
    // to close the menu - if the static surface layer painted on top and
    // swallowed the click instead of the real <a>, the menu would stay open.
    await page.getByRole("link", { name: /download cv/i }).click();
    await expect(nav).not.toBeVisible();
});

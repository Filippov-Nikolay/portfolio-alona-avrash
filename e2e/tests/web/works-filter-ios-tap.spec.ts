import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context, hasTouch }, testInfo) => {
    test.skip(!hasTouch, "requires a touch-capable browser context");

    await context.addCookies([
        {
            name: "site-preloader",
            value: "1",
            url: String(testInfo.project.use.baseURL),
        },
    ]);
});

test("a single tap on a works filter pill applies it immediately", async ({ page }) => {
    await page.goto("/en/works");

    const cards = page.getByTestId("works-card");
    await expect(cards.first()).toBeVisible();

    const brandingPill = page.getByRole("radio", { name: "Branding", exact: true });
    await brandingPill.tap();

    await expect(page).toHaveURL(/filter=branding/);
    await expect(brandingPill).toHaveAttribute("aria-checked", "true");
    await expect
        .poll(() =>
            cards.evaluateAll((elements) =>
                elements.every((element) => element.getAttribute("data-category") === "Branding")
            )
        )
        .toBe(true);
});

test("tapping a second filter replaces the first instead of combining with it", async ({
    page,
}) => {
    await page.goto("/en/works");

    const brandingPill = page.getByRole("radio", { name: "Branding", exact: true });
    const packagingPill = page.getByRole("radio", { name: "Packaging", exact: true });

    await brandingPill.tap();
    await expect(page).toHaveURL(/filter=branding/);

    await packagingPill.tap();
    await expect(page).toHaveURL(/filter=packaging/);
    await expect(page).not.toHaveURL(/filter=branding/);
    await expect(brandingPill).toHaveAttribute("aria-checked", "false");
    await expect(packagingPill).toHaveAttribute("aria-checked", "true");

    const cards = page.getByTestId("works-card");
    await expect(cards.first()).toBeVisible();
    await expect
        .poll(() =>
            cards.evaluateAll((elements) =>
                elements.every((element) => element.getAttribute("data-category") === "Packaging")
            )
        )
        .toBe(true);
});

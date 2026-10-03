import { expect, test } from "../../fixtures/test";

// Runs on the frozen content fixture (e2e/fixtures/content) that every web
// spec uses. Assertions are shaped around "filtering narrows the set and All
// restores it" rather than an exact hardcoded count, so the test doesn't need
// updating every time a project is added to the fixture.
test.describe("works filtering", () => {
    test("filtering by category narrows the visible cards, and All restores them", async ({
        page,
    }) => {
        await page.goto("/en/works");

        const cards = page.getByTestId("works-card");
        await expect(cards.first()).toBeVisible();
        const totalCount = await cards.count();
        expect(totalCount).toBeGreaterThan(0);

        await page.getByRole("radio", { name: "Branding", exact: true }).click();
        await expect(page).toHaveURL(/filter=branding/);

        await expect(async () => {
            const filteredCount = await cards.count();
            expect(filteredCount).toBeGreaterThan(0);
            expect(filteredCount).toBeLessThanOrEqual(totalCount);
        }).toPass();

        const categories = await cards.evaluateAll((elements) =>
            elements.map((element) => element.getAttribute("data-category"))
        );
        expect(categories.every((category) => category === "Branding")).toBe(true);

        await page.getByRole("radio", { name: "Packaging", exact: true }).click();
        await expect(page).toHaveURL(/filter=packaging/);
        await expect(page).not.toHaveURL(/filter=branding/);
        await expect(cards.first()).toBeVisible();
        const packagingCategories = await cards.evaluateAll((elements) =>
            elements.map((element) => element.getAttribute("data-category"))
        );
        expect(packagingCategories.every((category) => category === "Packaging")).toBe(true);

        await page.getByRole("radio", { name: "Web Design", exact: true }).click();
        await expect(page).toHaveURL(/filter=web-design/);
        await expect(cards.first()).toBeVisible();
        const webDesignCategories = await cards.evaluateAll((elements) =>
            elements.map((element) => element.getAttribute("data-category"))
        );
        expect(webDesignCategories.every((category) => category === "Web Design")).toBe(true);

        await page.getByRole("radio", { name: "All", exact: true }).click();
        await expect(cards).toHaveCount(totalCount);
    });

    test("category filters from a direct URL include secondary project categories", async ({
        page,
    }) => {
        await page.goto("/en/works?filter=web-design");

        const cards = page.getByTestId("works-card");
        await expect(cards.first()).toBeVisible();
        expect(await cards.count()).toBeGreaterThan(0);
        await expect(page.getByRole("radio", { name: "Web Design", exact: true })).toHaveAttribute(
            "aria-checked",
            "true"
        );

        await page.goto("/en/works?filter=packaging");
        await expect(cards.first()).toBeVisible();
        expect(await cards.count()).toBeGreaterThan(0);
    });
});

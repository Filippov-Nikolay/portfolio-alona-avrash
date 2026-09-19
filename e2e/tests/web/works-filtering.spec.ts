import { expect, test } from "@playwright/test";

// Reads the site's real, checked-in project content (packages/content-data)
// rather than anything admin's isolated test dataset writes - this is a
// read-only test of the public filter UI, not a content-mutation flow, so
// it needs no isolation of its own. Assertions are shaped around "filtering
// narrows the set and All restores it" rather than an exact hardcoded count,
// so the test doesn't need updating every time a project is added.
test.describe("works filtering", () => {
    test("filtering by category narrows the visible cards, and All restores them", async ({
        page,
    }) => {
        await page.goto("/en/works");

        const cards = page.getByTestId("works-card");
        await expect(cards.first()).toBeVisible();
        const totalCount = await cards.count();
        expect(totalCount).toBeGreaterThan(0);

        await page.getByRole("button", { name: "Branding", exact: true }).click();
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

        await page.getByRole("button", { name: "All", exact: true }).click();
        await expect(cards).toHaveCount(totalCount);
    });
});

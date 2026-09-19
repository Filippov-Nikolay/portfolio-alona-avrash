import { expect, test } from "@playwright/test";

test.describe("create project", () => {
    test("creates a project with a name and a category, then lists it", async ({ page }) => {
        await page.goto("/works/projects/new");

        await page.getByLabel("Name").fill("E2E Create Project");
        await page.getByRole("button", { name: "Branding" }).click();

        const saveButton = page.getByRole("button", { name: "Create project" });
        await expect(saveButton).toBeEnabled();
        await saveButton.click();

        await page.waitForURL("/works/projects");
        await expect(
            page.locator("table").getByRole("link", { name: "E2E Create Project" })
        ).toBeVisible();
    });

    test("rejects a project with no category selected", async ({ page }) => {
        await page.goto("/works/projects/new");

        await page.getByLabel("Name").fill("No Category Project");
        await page.getByRole("button", { name: "Create project" }).click();

        await expect(page.getByText("Pick at least one category.")).toBeVisible();
        await expect(page).toHaveURL(/\/works\/projects\/new$/);
    });
});

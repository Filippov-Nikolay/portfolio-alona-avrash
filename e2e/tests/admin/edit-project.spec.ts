import { expect, test } from "@playwright/test";

test.describe("edit project", () => {
    test("edits an existing project's name and category", async ({ page }) => {
        await page.goto("/works/projects/new");
        await page.getByLabel("Name").fill("E2E Edit Before");
        await page.getByRole("button", { name: "Branding" }).click();
        await page.getByRole("button", { name: "Create project" }).click();
        await page.waitForURL("/works/projects");

        await page.locator("table").getByRole("link", { name: "E2E Edit Before" }).click();
        await page.waitForURL(/\/works\/projects\/\d+$/);

        await page.getByLabel("Name").fill("E2E Edit After");
        await page.getByRole("button", { name: "Packaging" }).click();

        const saveButton = page.getByRole("button", { name: "Save changes" });
        await expect(saveButton).toBeEnabled();
        await saveButton.click();

        await page.waitForURL("/works/projects");
        const row = page.locator("table").getByRole("link", { name: "E2E Edit After" });
        await expect(row).toBeVisible();
        await expect(
            page.locator("table").getByRole("link", { name: "E2E Edit Before" })
        ).toHaveCount(0);
    });

    test("deletes a project from its edit page", async ({ page }) => {
        await page.goto("/works/projects/new");
        await page.getByLabel("Name").fill("E2E Delete Me");
        await page.getByRole("button", { name: "Branding" }).click();
        await page.getByRole("button", { name: "Create project" }).click();
        await page.waitForURL("/works/projects");

        await page.locator("table").getByRole("link", { name: "E2E Delete Me" }).click();
        await page.waitForURL(/\/works\/projects\/\d+$/);

        await page.getByRole("button", { name: "Delete project" }).click();
        await page.getByRole("button", { name: "Delete", exact: true }).click();

        await page.waitForURL("/works/projects");
        await expect(
            page.locator("table").getByRole("link", { name: "E2E Delete Me" })
        ).toHaveCount(0);
    });
});

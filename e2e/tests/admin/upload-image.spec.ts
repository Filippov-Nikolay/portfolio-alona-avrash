import path from "node:path";
import { expect, test } from "@playwright/test";

const FIXTURE_IMAGE = path.join(__dirname, "..", "..", "fixtures", "e2e-upload-fixture.png");

test.describe("upload image", () => {
    test("uploads an image into the gallery and it becomes the project's thumbnail", async ({
        page,
    }) => {
        await page.goto("/works/projects/new");
        await page.getByLabel("Name").fill("E2E Upload Project");
        await page.getByRole("button", { name: "Branding" }).click();

        await page.getByRole("button", { name: "Add item" }).click();
        await expect(page.getByText("Click to upload")).toBeVisible();

        await page.locator('input[type="file"]').setInputFiles(FIXTURE_IMAGE);

        // The row shows an optimistic local blob:// preview the instant the
        // file is picked, well before the upload actually finishes - that
        // preview is swapped for the real uploaded src only once
        // uploadProjectImageAction resolves, so waiting on the <img>'s src
        // itself (not the placeholder text) is what proves the upload,
        // not just the file picker, actually completed.
        await expect(page.locator("img")).toHaveAttribute("src", /e2e-upload-fixture/, {
            timeout: 15_000,
        });
        await expect(page.getByText("Upload failed", { exact: false })).toHaveCount(0);

        await page.getByRole("button", { name: "Create project" }).click();
        await page.waitForURL("/works/projects");

        const row = page.locator("table tr", { hasText: "E2E Upload Project" });
        await expect(row.locator("img")).toHaveAttribute("src", /e2e-upload-fixture/);
    });
});

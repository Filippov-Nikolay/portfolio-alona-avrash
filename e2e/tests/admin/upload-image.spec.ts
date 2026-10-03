import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { createNoisePng } from "../../fixtures/png";

const FIXTURES = path.join(__dirname, "..", "..", "fixtures");
const FIXTURE_IMAGE = path.join(FIXTURES, "e2e-upload-fixture.png");
const FIXTURE_GIF = path.join(FIXTURES, "e2e-upload-fixture.gif");
const SCRATCH_CONTENT_DIR = path.join(__dirname, "..", "..", ".scratch", "content");

test.describe("upload image", () => {
    test("uploads an image into the gallery and it becomes the project's thumbnail", async ({
        page,
    }) => {
        await page.goto("/works/projects/new");
        await page.getByLabel("Name").fill("E2E Upload Project");
        await page.getByRole("button", { name: "Branding" }).click();

        await page.getByRole("button", { name: "Add image" }).click();
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

    test("stores a WebP poster next to an uploaded GIF and saves it with the image", async ({
        page,
    }) => {
        await page.goto("/works/projects/new");
        await page.getByLabel("Name").fill("E2E GIF Project");
        await page.getByRole("button", { name: "Branding" }).click();

        await page.getByRole("button", { name: "Add image" }).click();
        await page.locator('input[type="file"]').setInputFiles(FIXTURE_GIF);
        await expect(page.locator("img")).toHaveAttribute("src", /e2e-upload-fixture\.gif$/, {
            timeout: 15_000,
        });

        await page.getByRole("button", { name: "Create project" }).click();
        await page.waitForURL("/works/projects");

        const projects = JSON.parse(
            readFileSync(path.join(SCRATCH_CONTENT_DIR, "projects.json"), "utf-8")
        ) as { name: string; image: { src: string; posterSrc?: string }[] }[];
        const [image] = projects.find((project) => project.name === "E2E GIF Project")!.image;
        expect(image.posterSrc).toBe(image.src.replace(/\.gif$/, "-poster.webp"));
        const poster = readFileSync(
            path.join(SCRATCH_CONTENT_DIR, "uploads", path.basename(image.posterSrc!))
        );
        expect(poster.subarray(0, 4).toString("ascii")).toBe("RIFF");
        expect(poster.subarray(8, 12).toString("ascii")).toBe("WEBP");
    });

    test("uploads an image larger than the 1 MB Server Action default", async ({ page }) => {
        const png = createNoisePng(1000, 1000);
        expect(png.length).toBeGreaterThan(2.5 * 1024 * 1024);

        await page.goto("/works/projects/new");
        await page.getByRole("button", { name: "Add image" }).click();
        await page
            .locator('input[type="file"]')
            .setInputFiles({ name: "e2e-large-upload.png", mimeType: "image/png", buffer: png });

        await expect(page.locator("img")).toHaveAttribute("src", /e2e-large-upload\.png$/, {
            timeout: 30_000,
        });
    });

    test("explains the size limit without sending an image over 4 MB", async ({ page }) => {
        const png = createNoisePng(1300, 1100);
        expect(png.length).toBeGreaterThan(4 * 1024 * 1024);
        let largestRequestBody = 0;
        page.on("request", (request) => {
            largestRequestBody = Math.max(
                largestRequestBody,
                request.postDataBuffer()?.length ?? 0
            );
        });

        await page.goto("/works/projects/new");
        await page.getByRole("button", { name: "Add image" }).click();
        await page
            .locator('input[type="file"]')
            .setInputFiles({ name: "e2e-oversized.png", mimeType: "image/png", buffer: png });

        await expect(page.getByText("Image is too large (max 4 MB).")).toBeVisible();
        expect(largestRequestBody).toBeLessThan(64 * 1024);
    });
});

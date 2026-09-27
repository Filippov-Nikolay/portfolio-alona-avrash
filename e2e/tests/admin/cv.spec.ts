import { expect, test } from "@playwright/test";

import { createCvPdf as pdf } from "../../fixtures/cv";

test.beforeEach(async ({ request, baseURL }) => {
    // The admin E2E server always uses an isolated ADMIN_CONTENT_DIR.
    expect((await request.delete("/api/cv", { headers: { origin: baseURL! } })).ok()).toBeTruthy();
});

test("previews locally, saves, replaces and deletes the website CV", async ({
    page,
    request,
}, testInfo) => {
    await page.goto("/global/cv");
    await expect(page.getByRole("heading", { name: "CV", exact: true })).toBeVisible();
    await expect(page.getByText("Not uploaded", { exact: true })).toBeVisible();
    const input = page.getByLabel("Choose CV PDF");
    const first = pdf("Alona Avrash - CV preview", true);
    const file = { name: "Alona CV.pdf", mimeType: "application/pdf", buffer: first };
    const uploads: string[] = [];
    page.on("request", (request) => {
        if (request.method() === "POST" && request.url().includes("/api/cv"))
            uploads.push(request.url());
    });

    await input.setInputFiles(file);
    await expect(page.getByRole("img", { name: /Selected CV preview/ })).toBeVisible({
        timeout: 15_000,
    });
    // Assert real rendered ink, not just a viewer placeholder or a white canvas.
    expect(
        await page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
            const pixels = canvas
                .getContext("2d")!
                .getImageData(0, 0, canvas.width, canvas.height).data;
            let ink = 0;
            for (let i = 0; i < pixels.length; i += 4)
                if (pixels[i] < 100 && pixels[i + 3] > 0) ink++;
            return ink;
        })
    ).toBeGreaterThan(50);
    await page.getByRole("button", { name: "Next PDF page" }).click();
    await expect(page.getByRole("img", { name: /page 2 of 2/ })).toBeVisible();
    await page.getByRole("button", { name: "Previous PDF page" }).click();
    await expect(page.getByRole("img", { name: /page 1 of 2/ })).toBeVisible();
    expect(uploads).toHaveLength(0);
    expect((await request.get("/api/cv")).status()).toBe(404);
    await page.getByRole("button", { name: "Discard", exact: true }).click();
    await expect(page.locator("canvas")).toHaveCount(0);

    await input.setInputFiles(file);
    await page.getByRole("button", { name: "Save CV", exact: true }).click();
    await expect(page.getByText("Published", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: /Saved CV preview/ })).toBeVisible();
    await page.reload();
    await expect(page.getByText("Published", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: /Saved CV preview/ })).toBeVisible({
        timeout: 15_000,
    });
    const saved = await request.get("/api/cv?download=1");
    expect(saved.headers()["content-disposition"]).toContain("attachment;");
    expect(await saved.body()).toEqual(first);
    await page.screenshot({ path: testInfo.outputPath("cv-published.png"), fullPage: true });

    const replacement = pdf("Alona Avrash - Updated CV");
    await input.setInputFiles({ ...file, name: "Updated CV.pdf", buffer: replacement });
    await page.route("**/api/cv", async (route) => {
        if (route.request().method() === "POST")
            await route.fulfill({
                status: 500,
                json: { error: "Could not save the CV. Please try again." },
            });
        else await route.continue();
    });
    await page.getByRole("button", { name: "Save CV", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Could not save");
    expect(await (await request.get("/api/cv")).body()).toEqual(first);
    await expect(page.getByRole("img", { name: /Selected CV preview/ })).toBeVisible();
    await page.unroute("**/api/cv");
    await page.getByRole("button", { name: "Save CV", exact: true }).click();
    await expect(page.getByRole("img", { name: /Saved CV preview/ })).toBeVisible();
    expect(await (await request.get("/api/cv")).body()).toEqual(replacement);

    await page.getByRole("button", { name: "Delete CV", exact: true }).click();
    await page.getByRole("button", { name: "Keep CV", exact: true }).click();
    expect((await request.get("/api/cv")).status()).toBe(200);
    await page.getByRole("button", { name: "Delete CV", exact: true }).click();
    await page.getByRole("button", { name: "Delete permanently", exact: true }).click();
    await expect(page.getByText("Not uploaded", { exact: true })).toBeVisible();
    expect((await request.get("/api/cv")).status()).toBe(404);
    await page.reload();
    await expect(page.locator("canvas")).toHaveCount(0);
});

test("rejects invalid files before upload and fits narrow screens", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/global/cv");
    const input = page.getByLabel("Choose CV PDF");
    await input.setInputFiles({
        name: "not-a-pdf.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("not PDF"),
    });
    await expect(page.getByRole("main").getByRole("alert")).toContainText("not a valid PDF");
    await expect(page.getByRole("button", { name: "Save CV", exact: true })).toHaveCount(0);
    await input.setInputFiles({
        name: "Alona CV.pdf",
        mimeType: "application/pdf",
        buffer: pdf("Mobile preview"),
    });
    await expect(page.getByRole("img", { name: /Selected CV preview/ })).toBeVisible();
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
    ).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath("cv-mobile-draft.png"), fullPage: true });
    await page.setViewportSize({ width: 320, height: 720 });
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
    ).toBeTruthy();
    await page.getByRole("button", { name: "Discard", exact: true }).click();
});

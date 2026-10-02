import { expect, test } from "@playwright/test";

import { createCvPdf as pdf } from "../../fixtures/cv";

test.beforeEach(async ({ request, baseURL }) => {
    // The admin E2E server always uses an isolated ADMIN_CONTENT_DIR.
    for (const locale of ["en", "pl"]) {
        const response = await request.delete(`/api/cv?locale=${locale}`, {
            headers: { origin: baseURL! },
        });
        expect(response.ok()).toBeTruthy();
    }
});

test("previews locally, saves, replaces and deletes the CV of each language", async ({
    page,
    request,
}, testInfo) => {
    await page.goto("/global/cv");
    await expect(page.getByRole("heading", { name: "CV", exact: true })).toBeVisible();
    const english = page.getByRole("listitem", { name: "English CV" });
    const polish = page.getByRole("listitem", { name: "Polish CV" });
    await expect(english.getByText("Not uploaded", { exact: true })).toBeVisible();
    await expect(polish.getByText("Not uploaded", { exact: true })).toBeVisible();
    const input = page.getByLabel("Choose CV PDF");
    const language = page.getByLabel("Language");
    const first = pdf("Alona Avrash - CV preview", true);
    const file = { name: "Alona CV.pdf", mimeType: "application/pdf", buffer: first };
    const uploads: string[] = [];
    const previewRequests: string[] = [];
    page.on("request", (request) => {
        if (request.method() === "POST" && request.url().includes("/api/cv"))
            uploads.push(request.url());
        if (request.method() === "GET" && new URL(request.url()).pathname.startsWith("/api/cv"))
            previewRequests.push(request.url());
    });

    await input.setInputFiles(file);
    await expect(page.getByRole("img", { name: /Selected English CV preview/ })).toBeVisible({
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
    expect((await request.get("/api/cv?locale=en")).status()).toBe(404);
    await page.getByRole("button", { name: "Discard", exact: true }).click();
    await expect(page.locator("canvas")).toHaveCount(0);

    await input.setInputFiles(file);
    await page.getByRole("button", { name: "Save CV", exact: true }).click();
    await expect(english.getByText("Published", { exact: true })).toBeVisible();
    await expect(polish.getByText("Visitors get the English CV instead.")).toBeVisible();
    await expect(page.getByRole("img", { name: /Saved English CV preview/ })).toBeVisible();

    const polishCv = pdf("Alona Avrash - CV po polsku");
    await language.click();
    await page.getByRole("option", { name: "Polish", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Upload CV", exact: true })).toBeVisible();
    await input.setInputFiles({ ...file, name: "CV PL.pdf", buffer: polishCv });
    await expect(page.getByText("Ready to save as the Polish CV")).toBeVisible();
    await page.getByRole("button", { name: "Save CV", exact: true }).click();
    await expect(polish.getByText("Published", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: /Saved Polish CV preview/ })).toBeVisible();
    await page.reload();
    await expect(english.getByText("Published", { exact: true })).toBeVisible();
    await expect(polish.getByText("CV PL.pdf")).toBeVisible();
    await page.getByRole("button", { name: "Select English CV" }).click();
    await expect(page.getByRole("img", { name: /Saved English CV preview/ })).toBeVisible({
        timeout: 15_000,
    });
    await page.getByRole("button", { name: "Next PDF page" }).click();
    const englishCanvas = await page
        .getByRole("img", { name: /Saved English CV preview, page 2 of 2/ })
        .elementHandle();
    await expect(
        page.getByRole("img", { name: /Saved English CV preview, page 2 of 2/ })
    ).toBeVisible();
    await page.getByRole("button", { name: "Select Polish CV" }).click();
    await expect(page.getByRole("img", { name: /Saved Polish CV preview/ })).toBeVisible();
    const loadedRequests = previewRequests.length;
    for (const name of ["English", "Polish", "English"]) {
        await page.getByRole("button", { name: `Select ${name} CV` }).click();
        await expect(
            page.getByRole("img", { name: new RegExp(`Saved ${name} CV preview`) })
        ).toBeVisible();
    }
    expect(previewRequests).toHaveLength(loadedRequests);
    expect(await englishCanvas!.evaluate((canvas) => canvas.isConnected)).toBeTruthy();
    await expect(
        page.getByRole("img", { name: /Saved English CV preview, page 2 of 2/ })
    ).toBeVisible();
    const saved = await request.get("/api/cv?locale=en&download=1");
    expect(saved.headers()["content-disposition"]).toContain("attachment;");
    expect(await saved.body()).toEqual(first);
    expect(await (await request.get("/api/cv?locale=pl")).body()).toEqual(polishCv);
    await page.screenshot({ path: testInfo.outputPath("cv-published.png"), fullPage: true });

    const replacement = pdf("Alona Avrash - Updated CV");
    await input.setInputFiles({ ...file, name: "Updated CV.pdf", buffer: replacement });
    await expect(page.getByRole("heading", { name: "Replace English CV" })).toBeVisible();
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
    expect(await (await request.get("/api/cv?locale=en")).body()).toEqual(first);
    await expect(page.getByRole("img", { name: /Selected English CV preview/ })).toBeVisible();
    await page.unroute("**/api/cv");
    await page.getByRole("button", { name: "Save CV", exact: true }).click();
    await expect(page.getByRole("img", { name: /Saved English CV preview/ })).toBeVisible();
    expect(await englishCanvas!.evaluate((canvas) => canvas.isConnected)).toBeFalsy();
    expect(await (await request.get("/api/cv?locale=en")).body()).toEqual(replacement);
    expect(await (await request.get("/api/cv?locale=pl")).body()).toEqual(polishCv);

    await page.getByRole("button", { name: "Delete English CV" }).click();
    await page.getByRole("button", { name: "Keep CV", exact: true }).click();
    expect((await request.get("/api/cv?locale=en")).status()).toBe(200);
    await page.getByRole("button", { name: "Delete English CV" }).click();
    await page.getByRole("button", { name: "Delete permanently", exact: true }).click();
    await expect(english.getByText("Visitors get the Polish CV instead.")).toBeVisible();
    expect((await request.get("/api/cv?locale=en")).status()).toBe(404);
    expect((await request.get("/api/cv?locale=pl")).status()).toBe(200);

    await page.getByRole("button", { name: "Delete Polish CV" }).click();
    await page.getByRole("button", { name: "Delete permanently", exact: true }).click();
    await expect(polish.getByText("The download button is disabled.")).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
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
    await expect(page.getByRole("img", { name: /Selected English CV preview/ })).toBeVisible();
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

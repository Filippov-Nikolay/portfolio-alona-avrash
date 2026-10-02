import { expect, test } from "@playwright/test";

const PAGES = ["/en", "/pl", "/en/works", "/en/works/esencha", "/en/contact", "/en/legal/privacy"];

test.beforeEach(async ({ context }, testInfo) => {
    await context.addCookies([
        { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
    ]);
});

for (const path of PAGES) {
    test(`${path} hydrates without duplicate ids`, async ({ page }) => {
        const hydrationErrors: string[] = [];
        page.on("console", (message) => {
            if (/hydrat|did not match|server rendered/i.test(message.text())) {
                hydrationErrors.push(message.text());
            }
        });
        page.on("pageerror", (error) => {
            if (/hydrat|did not match|server rendered/i.test(error.message)) {
                hydrationErrors.push(error.message);
            }
        });

        await page.goto(path, { waitUntil: "load" });
        await page.waitForTimeout(2000);

        const duplicates = await page.evaluate(() => {
            const counts = new Map<string, number>();
            for (const element of document.querySelectorAll("[id]")) {
                if (!element.id) continue;
                counts.set(element.id, (counts.get(element.id) ?? 0) + 1);
            }
            return [...counts].filter(([, count]) => count > 1).map(([id]) => id);
        });

        expect(duplicates).toEqual([]);
        expect(hydrationErrors).toEqual([]);
    });
}

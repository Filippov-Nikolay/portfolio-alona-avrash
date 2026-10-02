import type { Page } from "@playwright/test";

export async function waitForStableDocumentHeight(page: Page) {
    await page.evaluate(async () => {
        let previous = -1;
        let stableFrames = 0;
        for (let frame = 0; frame < 600 && stableFrames < 15; frame++) {
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
            const height = document.documentElement.scrollHeight;
            stableFrames = height === previous ? stableFrames + 1 : 0;
            previous = height;
        }
    });
}

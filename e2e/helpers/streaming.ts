import type { Page } from "@playwright/test";

export async function waitForStreamedContent(page: Page) {
    await page.waitForFunction(() => !document.querySelector('div[hidden][id^="S:"]'));
}

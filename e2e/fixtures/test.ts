import { test as base, type Page } from "@playwright/test";

export * from "@playwright/test";

async function waitForStreamedContent(page: Page) {
    await page.waitForFunction(() => !document.querySelector('div[hidden][id^="S:"]'));
}

export const test = base.extend({
    page: async ({ page, javaScriptEnabled }, provide) => {
        if (javaScriptEnabled !== false) {
            const goto = page.goto.bind(page);
            const reload = page.reload.bind(page);
            page.goto = async (url, options) => {
                const response = await goto(url, options);
                await waitForStreamedContent(page);
                return response;
            };
            page.reload = async (options) => {
                const response = await reload(options);
                await waitForStreamedContent(page);
                return response;
            };
        }
        await provide(page);
    },
});

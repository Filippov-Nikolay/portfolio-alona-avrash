import { expect, test } from "../../fixtures/test";

test.beforeEach(async ({ context }, testInfo) => {
    await context.addCookies([
        { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
    ]);
});

test("the in-flow table of contents never pulls a mobile reader back up", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/legal/terms");

    const pullBacks = await page.evaluate(async () => {
        const end = document.documentElement.scrollHeight - innerHeight;
        const misses: string[] = [];
        let target = 0;
        for (let step = 0; step < 40 && target < end - 120; step++) {
            target += 120;
            scrollTo(0, target);
            await new Promise((resolve) => setTimeout(resolve, 120));
            if (scrollY < target - 40) misses.push(`wanted ${target}, got ${Math.round(scrollY)}`);
            target = scrollY;
        }
        return misses;
    });

    expect(pullBacks).toEqual([]);
});

test("the sticky desktop table of contents scrolls itself to the active section", async ({
    page,
}) => {
    await page.setViewportSize({ width: 1440, height: 420 });
    await page.goto("/en/legal/privacy");
    const toc = page.locator("main details");
    await expect
        .poll(() => toc.evaluate((element) => element.scrollHeight > element.clientHeight))
        .toBe(true);

    const target = await page.evaluate(() => {
        const y = document.documentElement.scrollHeight - innerHeight - 40;
        scrollTo(0, y);
        return Math.round(scrollY);
    });

    await expect
        .poll(() =>
            toc.evaluate((element) => {
                const active = element.querySelector('[aria-current="location"]');
                if (!active) return false;
                const box = element.getBoundingClientRect();
                const link = active.getBoundingClientRect();
                return link.top >= box.top - 1 && link.bottom <= box.bottom + 1;
            })
        )
        .toBe(true);
    expect(await toc.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    expect(await page.evaluate(() => Math.round(scrollY))).toBe(target);
});

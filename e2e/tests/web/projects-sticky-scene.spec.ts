import { expect, test } from "../../fixtures/test";

test.beforeEach(async ({ context }, testInfo) => {
    await context.addCookies([
        { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
    ]);
});

test("the Projects runway ships in the server HTML", async ({ request }) => {
    const html = await (await request.get("/en")).text();

    expect(html).toMatch(/--projects-steps:\s*[\d.]+/);
});

test("Projects stays glued to the viewport when the layout above shifts before a refresh", async ({
    page,
}) => {
    await page.goto("/en");
    await expect(page.locator("#projects [data-phase]")).toBeAttached();
    await page.waitForTimeout(800);

    const offsets = await page.evaluate(async () => {
        const scene = document.querySelector<HTMLElement>("#projects [data-phase]")!;
        const runway = scene.parentElement!;
        const frame = () =>
            new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        // A finger on the screen holds ScrollTrigger refreshes, as on iOS while
        // the browser chrome resizes, so the layout shift is not re-measured.
        document.dispatchEvent(
            new PointerEvent("pointerdown", { pointerId: 91, pointerType: "touch" })
        );
        const shift = document.createElement("div");
        shift.style.height = "300px";
        document.querySelector("#projects")!.before(shift);
        await frame();

        const top = runway.getBoundingClientRect().top + scrollY;
        const end = top + runway.offsetHeight - scene.offsetHeight;
        const result = [];
        for (const y of [top + 10, end - 10, end + 10, end + 120]) {
            scrollTo(0, y);
            await frame();
            const expected = y <= end ? 0 : end - y;
            result.push(Math.abs(scene.getBoundingClientRect().top - expected) <= 1);
        }
        shift.remove();
        document.dispatchEvent(
            new PointerEvent("pointerup", { pointerId: 91, pointerType: "touch" })
        );
        return result;
    });

    expect(offsets).toEqual([true, true, true, true]);
});

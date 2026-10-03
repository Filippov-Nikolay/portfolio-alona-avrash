import { expect, test } from "../../fixtures/test";

const viewports = [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
] as const;

test("missing URLs answer with a real 404 status, existing pages with 200", async ({ request }) => {
    const statuses = async (paths: string[]) =>
        Promise.all(paths.map(async (path) => [path, (await request.get(path)).status()] as const));

    expect(
        await statuses([
            "/en/definitely-missing",
            "/en/definitely/missing",
            "/en/works/definitely-missing",
            "/en/works/esencha/extra",
            "/en/legal/definitely-missing",
            "/en/contact/definitely-missing",
            "/pl/definitely-missing",
        ])
    ).toEqual([
        ["/en/definitely-missing", 404],
        ["/en/definitely/missing", 404],
        ["/en/works/definitely-missing", 404],
        ["/en/works/esencha/extra", 404],
        ["/en/legal/definitely-missing", 404],
        ["/en/contact/definitely-missing", 404],
        ["/pl/definitely-missing", 404],
    ]);

    expect(
        await statuses(["/en", "/pl/works", "/en/works/esencha", "/en/contact", "/en/legal/terms"])
    ).toEqual([
        ["/en", 200],
        ["/pl/works", 200],
        ["/en/works/esencha", 200],
        ["/en/contact", 200],
        ["/en/legal/terms", 200],
    ]);
});

for (const viewport of viewports) {
    test(`branded 404 page is complete on ${viewport.name}`, async ({ page }, testInfo) => {
        const negativeTimestampErrors: string[] = [];
        page.on("pageerror", (error) => {
            if (error.message.includes("cannot have a negative time stamp")) {
                negativeTimestampErrors.push(error.message);
            }
        });

        await page.setViewportSize(viewport);
        await page.context().addCookies([
            {
                name: "site-preloader",
                value: "1",
                url: String(testInfo.project.use.baseURL),
            },
        ]);

        await page.goto("/en/definitely-missing");

        await expect(page.getByRole("heading", { name: "This page went off-brand" })).toBeVisible();
        await expect(page.locator("[data-not-found-meta]").first()).toHaveCSS(
            "color",
            "rgb(0, 0, 0)"
        );
        const homeLink = page.getByRole("link", { name: "Back to home" });
        const worksLink = page.getByRole("link", { name: "View projects" });
        await expect(homeLink).toHaveAttribute("href", "/en");
        await expect(worksLink).toHaveAttribute("href", "/en/works");

        if (viewport.name === "desktop") {
            await homeLink.hover();
            await expect(homeLink).toHaveCSS("background-color", "rgb(234, 253, 39)");
            await expect(homeLink).toHaveCSS("color", "rgb(0, 0, 0)");

            await worksLink.hover();
            await expect(worksLink).toHaveCSS("background-color", "rgb(0, 0, 0)");
            await expect(worksLink).toHaveCSS("color", "rgb(255, 255, 255)");
        }

        const code = page.locator("[data-not-found-code]");
        await expect(code).toContainText("404");
        await expect
            .poll(async () => code.locator("[data-reel-move]").first().getAttribute("style"))
            .toContain("translateY(-4em)");

        const hasHorizontalOverflow = await code.evaluate((element) => {
            const view = element.ownerDocument.defaultView!;
            return view.document.documentElement.scrollWidth > view.innerWidth + 1;
        });
        expect(hasHorizontalOverflow).toBe(false);

        const fragmentsFitViewport = await page
            .locator("[data-not-found-fragment]")
            .evaluateAll((fragments) =>
                fragments.every((fragment) => {
                    const view = fragment.ownerDocument.defaultView!;
                    const rect = fragment.getBoundingClientRect();
                    return rect.left >= 0 && rect.right <= view.innerWidth;
                })
            );
        expect(fragmentsFitViewport).toBe(true);
        expect(negativeTimestampErrors).toEqual([]);
    });
}

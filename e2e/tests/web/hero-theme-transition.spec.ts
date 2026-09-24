import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context, page }, testInfo) => {
    await context.addCookies([
        {
            name: "site-preloader",
            value: "1",
            url: String(testInfo.project.use.baseURL),
        },
        {
            name: "site-theme",
            value: "light",
            url: String(testInfo.project.use.baseURL),
        },
    ]);
    await page.addInitScript('localStorage.setItem("site-theme", "light")');
});

test("Hero stays coherent throughout theme transitions", async ({ browserName, page }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));

    await page.goto("/en");

    const html = page.locator("html");
    const card = page.locator('[data-preset="hero"]');
    const headerLogo = page.locator("[data-hero-logo-target]");
    const heroTitle = page.locator("h1").first();
    const toggle = page.locator('button[aria-label^="Switch to"]').first();
    const isTouch = await html.evaluate(
        (element) =>
            element.ownerDocument.defaultView!.matchMedia("(hover: none) and (pointer: coarse)")
                .matches
    );
    await expect(card).toBeVisible();
    await expect(headerLogo).toBeVisible();
    await expect(heroTitle).toBeVisible();

    const readMaterial = () =>
        card.evaluate((element) => {
            const view = element.ownerDocument.defaultView!;
            const style = view.getComputedStyle(element);
            const lens = element.querySelector(":scope > span:nth-of-type(2)");

            return {
                filter: style.backdropFilter,
                name: style.viewTransitionName,
                nestedFilter: lens ? view.getComputedStyle(lens).backdropFilter : "none",
                backgroundColor: style.backgroundColor,
                backgroundImage: style.backgroundImage,
                borderColor: style.borderColor,
                boxShadow: style.boxShadow,
                surfaceOpacity: style.getPropertyValue("--glass-surface-opacity").trim(),
                depthOpacity: style.getPropertyValue("--glass-depth-opacity").trim(),
                lensOpacity: style.getPropertyValue("--glass-lens-opacity").trim(),
                causticOpacity: style.getPropertyValue("--glass-caustic-opacity").trim(),
                sheenOpacity: style.getPropertyValue("--glass-sheen-opacity").trim(),
                prismOpacity: style.getPropertyValue("--glass-prism-opacity").trim(),
            };
        });

    const light = await readMaterial();
    expect(light.name).toBe("none");
    if (isTouch) {
        expect(light.filter).toBe("none");
    } else {
        expect(light.filter).toContain("blur(");
    }
    expect(light.backgroundColor).toMatch(/^rgba\(/);
    expect(light.nestedFilter).toBe("none");

    await toggle.click();

    if (browserName === "webkit") {
        await expect(html).toHaveAttribute("data-theme", "dark");
        await expect(html).not.toHaveClass(/vt-running|is-theme-changing/);
    } else {
        await expect(html).toHaveClass(/vt-running/);
        await expect(html).not.toHaveClass(/is-theme-changing/);
        await page.waitForTimeout(100);
        await expect(html).toHaveClass(/vt-running/);
    }

    await expect(headerLogo).toBeVisible();
    await expect(heroTitle).toBeVisible();

    const during = await readMaterial();
    expect(during.name).toBe("none");
    if (isTouch) {
        expect(during.filter).toBe("none");
    } else {
        expect(during.filter).toContain("blur(");
    }
    expect(during).not.toEqual(light);

    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(html).not.toHaveClass(/vt-running/);
    expect(await readMaterial()).toEqual(during);
    const headerBlur = await headerLogo.evaluate(
        (element) => getComputedStyle(element).backdropFilter
    );
    if (isTouch) expect(headerBlur).toBe("none");
    else expect(headerBlur).toContain("blur(16px)");

    await toggle.click();
    await page.waitForTimeout(30);
    await toggle.click();

    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(html).not.toHaveClass(/vt-running/);
    expect(pageErrors).toEqual([]);
});

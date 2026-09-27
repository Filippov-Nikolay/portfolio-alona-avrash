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
    // Next can retain a hidden streamed copy briefly during hydration.
    const card = page.locator('[data-preset="hero"]:visible');
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
        await expect(html).toHaveClass(/is-theme-changing/);
        await expect(html).not.toHaveClass(/vt-running/);
        await page.waitForTimeout(100);
        await expect(html).toHaveClass(/is-theme-changing/);
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
    await expect(html).not.toHaveClass(/vt-running|is-theme-changing/);
    const settleMaterial = () =>
        card.evaluate(async (element) => {
            await Promise.all(
                element
                    .getAnimations()
                    .filter((animation) => animation instanceof CSSTransition)
                    .map((animation) => animation.finished.catch(() => {}))
            );
        });
    await settleMaterial();
    const dark = await readMaterial();
    expect(dark).not.toEqual(light);
    if (browserName !== "webkit") expect(dark).toEqual(during);
    const headerBlur = await headerLogo.evaluate(
        (element) => getComputedStyle(element).backdropFilter
    );
    if (isTouch) expect(headerBlur).toBe("none");
    else expect(headerBlur).toContain("blur(16px)");

    await toggle.click();
    await page.waitForTimeout(30);
    await toggle.click();

    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(html).not.toHaveClass(/vt-running|is-theme-changing/);
    await settleMaterial();
    expect(await readMaterial()).toEqual(dark);
    expect(pageErrors).toEqual([]);
});

test("WebKit interpolates theme colors in both directions", async ({ browserName, page }) => {
    test.skip(browserName !== "webkit", "Regression for WebKit's live-scene CSS fallback");
    await page.goto("/en");
    const toggle = page.locator('button[aria-label^="Switch to"]').first();
    await expect(toggle).toBeVisible();
    await expect(page.locator('[data-preset="hero"]:visible')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    // Let the initial no-transition hydration pass finish before sampling.
    await page.evaluate(
        () =>
            new Promise<void>((resolve) => {
                requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
            })
    );

    for (const target of ["dark", "light"] as const) {
        const samples = await toggle.evaluate((element) => {
            const values: number[] = [];
            const sample = () => {
                const color = getComputedStyle(document.body).backgroundColor;
                values.push(Number(color.match(/[\d.]+/)![0]));
            };
            sample();
            (element as HTMLButtonElement).click();
            const transition = document.body
                .getAnimations()
                .find(
                    (animation) =>
                        animation instanceof CSSTransition &&
                        animation.transitionProperty === "background-color"
                );
            if (!transition) throw new Error("Theme background transition did not start");
            // Sample real interpolated styles at fixed animation times. Software
            // WebKit can miss rAF samples even while idle on a loaded test machine.
            transition.pause();
            for (const time of [100, 200, 300]) {
                transition.currentTime = time;
                sample();
            }
            transition.finish();
            sample();
            return values;
        });
        expect(samples[0]).toBe(target === "dark" ? 255 : 0);
        expect(samples.at(-1)).toBe(target === "dark" ? 0 : 255);
        // Checking duration/class alone would let the old instantaneous switch pass.
        expect(new Set(samples.filter((value) => value > 0 && value < 255)).size).toBeGreaterThan(
            2
        );
        await expect(page.locator("html")).toHaveAttribute("data-theme", target);
        await expect(page.locator("html")).not.toHaveClass(/vt-running|is-theme-changing/);
    }
});

test("Reduced motion switches the theme without a transition", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en");
    const toggle = page.locator('button[aria-label^="Switch to"]').first();
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("html")).not.toHaveClass(/vt-running|is-theme-changing/);
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(0, 0, 0)");
});

import { expect, test } from "../../fixtures/test";

declare global {
    interface Window {
        homeReturnProbe: {
            recording: boolean;
            cameraStarts: string[];
            scrollWrites: { y: number; stack: string }[];
        };
        scrollForHomeReturnTest: (x: number, y: number) => void;
    }
}

test("Works to Home keeps the compact camera and defers refresh throughout a touch scroll", async ({
    context,
    page,
    hasTouch,
}, testInfo) => {
    test.skip(!hasTouch, "exercises a touch gesture followed by inertial scrolling");
    test.setTimeout(60_000);
    await context.addCookies([
        { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
    ]);
    await page.addInitScript(() => {
        window.homeReturnProbe = { recording: false, cameraStarts: [], scrollWrites: [] };
        const scroll = window.scrollTo.bind(window);
        window.scrollForHomeReturnTest = (x, y) => scroll(x, y);
        window.scrollTo = (optionsOrX: ScrollToOptions | number = {}, y?: number) => {
            if (window.homeReturnProbe.recording) {
                window.homeReturnProbe.scrollWrites.push({
                    y: typeof optionsOrX === "number" ? (y ?? 0) : (optionsOrX.top ?? scrollY),
                    stack: new Error().stack ?? "",
                });
            }
            if (typeof optionsOrX === "number") scroll(optionsOrX, y ?? 0);
            else scroll(optionsOrX);
        };
        const animate = Element.prototype.animate;
        Element.prototype.animate = function (keyframes, options) {
            if (this.matches('[class*="statsDepthPlane"]') && Array.isArray(keyframes)) {
                window.homeReturnProbe.cameraStarts.push(String(keyframes[0]?.transform));
            }
            return animate.call(this, keyframes, options);
        };
    });
    await page.goto("/en/works");
    await expect(page.getByTestId("works-card").first()).toBeVisible();
    await page.getByRole("link", { name: "Alona Avrash - Home", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/?$/);
    const plane = page.locator('[class*="statsDepthPlane"]');
    await expect
        .poll(() => plane.evaluate((element) => element.getAnimations()[0]?.playState))
        .toBe("paused");
    await expect(page.locator("#projects [data-phase]")).toBeAttached();

    const during = await page.evaluate(async () => {
        // Finish initial trigger construction, then exercise the delayed startup
        // refreshes and real layout changes while the user is already scrolling.
        for (let i = 0; i < 2; i++) await new Promise(requestAnimationFrame);
        const probe = window.homeReturnProbe;
        document.dispatchEvent(
            new PointerEvent("pointerdown", { pointerId: 71, pointerType: "touch" })
        );
        probe.recording = true;
        const spacer = document.createElement("div");
        spacer.id = "home-return-layout-probe";
        spacer.style.height = "10px";
        document.body.append(spacer);
        for (let i = 0; i < 90; i++) {
            if (i === 25) spacer.style.height = "25px";
            if (i === 50) {
                // No finger after this point, but native scroll events continue.
                document.dispatchEvent(
                    new PointerEvent("pointerup", { pointerId: 71, pointerType: "touch" })
                );
            }
            window.scrollForHomeReturnTest(0, 40 + i * 12);
            await new Promise(requestAnimationFrame);
        }
        // Sample after the scroll handler/render phases of the final frame.
        await new Promise(requestAnimationFrame);
        return {
            scrollWrites: [...probe.scrollWrites],
            cameraStarts: [...probe.cameraStarts],
            y: scrollY,
        };
    });
    await testInfo.attach("works-home-scroll-work", {
        body: JSON.stringify(during, null, 2),
        contentType: "application/json",
    });
    expect(during.cameraStarts.length).toBeGreaterThan(0);
    for (const transform of during.cameraStarts) {
        expect(Number(transform.match(/scale\(([^)]+)\)/)?.[1])).toBeCloseTo(2.58, 5);
    }
    expect(during.scrollWrites).toEqual([]);
    expect(during.y).toBe(40 + 89 * 12);

    // Deferred work must eventually run, then settle instead of refreshing
    // repeatedly in response to the pin spacers it just measured.
    await expect
        .poll(() => page.evaluate(() => window.homeReturnProbe.scrollWrites.length))
        .toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(during.y);
    await page.waitForTimeout(250);
    const writesAfterRefresh = await page.evaluate(
        () => window.homeReturnProbe.scrollWrites.length
    );
    await page.waitForTimeout(650);
    expect(await page.evaluate(() => window.homeReturnProbe.scrollWrites.length)).toBe(
        writesAfterRefresh
    );
    await expect.poll(() => plane.evaluate((element) => element.getAnimations().length)).toBe(1);
});

test("Stats to Hero defers refresh after native pointer cancellation and through inertia", async ({
    context,
    page,
    hasTouch,
}, testInfo) => {
    test.skip(!hasTouch, "exercises the native touch lifetime after pointercancel");
    test.setTimeout(60_000);
    await context.addCookies([
        { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
    ]);
    await page.addInitScript(() => {
        window.homeReturnProbe = { recording: false, cameraStarts: [], scrollWrites: [] };
        const scroll = window.scrollTo.bind(window);
        window.scrollForHomeReturnTest = (x, y) => scroll(x, y);
        window.scrollTo = (optionsOrX: ScrollToOptions | number = {}, y?: number) => {
            if (window.homeReturnProbe.recording) {
                window.homeReturnProbe.scrollWrites.push({
                    y: typeof optionsOrX === "number" ? (y ?? 0) : (optionsOrX.top ?? scrollY),
                    stack: new Error().stack ?? "",
                });
            }
            if (typeof optionsOrX === "number") scroll(optionsOrX, y ?? 0);
            else scroll(optionsOrX);
        };
    });
    await page.goto("/en");
    const camera = page.locator('[class*="statsDepthPlane"]');
    await expect
        .poll(() => camera.evaluate((element) => element.getAnimations()[0]?.playState))
        .toBe("paused");
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1300);
    const result = await page.evaluate(async () => {
        const root = document.getElementById("hero-transition-track")!;
        const stage = document.getElementById("hero-sticky-stage")!;
        const camera = document.getElementById("stats-camera-track")!;
        const top = root.getBoundingClientRect().top + scrollY;
        const end =
            top + camera.getBoundingClientRect().height - stage.getBoundingClientRect().height;
        window.scrollForHomeReturnTest(0, end);
        await new Promise((resolve) => setTimeout(resolve, 400));
        const touch = (name: string, count: number) => {
            // Preserve touch lifetime independently of Pointer Events, as a
            // browser does when handing the pan over to its native scroller.
            document.dispatchEvent(Object.assign(new Event(name), { touches: { length: count } }));
        };
        touch("touchstart", 1);
        document.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 72 }));
        document.dispatchEvent(new PointerEvent("pointercancel", { pointerId: 72 }));
        window.homeReturnProbe.recording = true;
        const spacer = document.createElement("div");
        spacer.style.height = "20px";
        document.body.append(spacer);
        // The user pauses mid-gesture. GSAP considers scrolling finished but
        // a refresh is still unsafe: the finger has not left the screen.
        await new Promise((resolve) => setTimeout(resolve, 450));
        const heldWrites = [...window.homeReturnProbe.scrollWrites];
        const strips = Array.from(document.querySelectorAll("#stats [data-reel-place]"));
        for (let i = 0; i < 90; i++) {
            if (i === 50) touch("touchend", 0);
            window.scrollForHomeReturnTest(0, end * (1 - i / 89));
            await new Promise(requestAnimationFrame);
        }
        await new Promise(requestAnimationFrame);
        return {
            heldWrites,
            scrollWrites: [...window.homeReturnProbe.scrollWrites],
            sameStrips: strips.every(
                (strip, i) => document.querySelectorAll("#stats [data-reel-place]")[i] === strip
            ),
            y: scrollY,
        };
    });
    await testInfo.attach("stats-hero-native-pan", {
        body: JSON.stringify(result, null, 2),
        contentType: "application/json",
    });
    expect(result.heldWrites).toEqual([]);
    expect(result.scrollWrites).toEqual([]);
    expect(result.sameStrips).toBe(true);
    expect(result.y).toBe(0);
    await expect
        .poll(() => page.evaluate(() => window.homeReturnProbe.scrollWrites.length))
        .toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
});

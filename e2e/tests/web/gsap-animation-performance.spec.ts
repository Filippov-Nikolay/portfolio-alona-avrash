import path from "node:path";
import { expect, test } from "@playwright/test";
import poses from "../../fixtures/projects-animation-poses.json";

interface Trigger {
    trigger: HTMLElement;
    pin?: HTMLElement;
    start: number;
    end: number;
    progress: number;
    vars: {
        invalidateOnRefresh?: boolean;
        onUpdate?: (state: { progress: number; getVelocity: () => number }) => void;
    };
}
interface Audit {
    counts: Record<string, number>;
    ScrollTrigger: { getAll: () => Trigger[]; refresh: () => void };
}
declare global {
    interface Window {
        __animationAudit: Audit;
    }
}
type AuditWindow = Window;

// Recorded from bac5316 before changing GSAP integration. Keep these snapshots
// frozen: they pin positions, perspective, scale, opacity and stacking order.
test.beforeEach(async ({ context, page, hasTouch }, testInfo) => {
    await page.setViewportSize(
        hasTouch ? { width: 390, height: 664 } : { width: 1920, height: 912 }
    );
    await context.addCookies([
        { name: "site-preloader", value: "1", url: String(testInfo.project.use.baseURL) },
    ]);
    await page.addInitScript({ path: path.join(__dirname, "../../fixtures/animation-audit.js") });
    await page.goto("/en");
    await page.waitForFunction(() =>
        (window as AuditWindow).__animationAudit?.ScrollTrigger?.getAll().some((t) => t.pin)
    );
    await page.waitForTimeout(1800);
});

test("Projects retains every pose forward and in reverse after a refresh", async ({
    page,
    hasTouch,
    browserName,
}) => {
    const expected = poses[hasTouch ? (browserName === "webkit" ? "webkit" : "touch") : "desktop"];
    const result = await page.evaluate(
        (progresses) => {
            const audit = (window as AuditWindow).__animationAudit;
            const trigger = audit.ScrollTrigger.getAll().find((t) => t.pin)!;
            const targets = [
                ...document.querySelectorAll<HTMLElement>("[data-project-card]"),
                document.querySelector<HTMLElement>("#projects h2")!,
                document.querySelector<HTMLAnchorElement>('#projects a[href$="/works"]')!
                    .parentElement!,
            ];
            const read = () =>
                targets.map((el) => {
                    const s = getComputedStyle(el);
                    return {
                        transform: s.transform,
                        opacity: s.opacity,
                        visibility: s.visibility,
                        zIndex: s.zIndex,
                    };
                });
            const snapshots = progresses.map((progress) => {
                trigger.vars.onUpdate!({ progress, getVelocity: () => 0 });
                return { progress, styles: read() };
            });
            for (const key in audit.counts) audit.counts[key] = 0;
            for (let index = 0; index < 240; index++)
                trigger.vars.onUpdate!({
                    progress: (index < 120 ? index : 240 - index) / 120,
                    getVelocity: () => 0,
                });
            const counts = { ...audit.counts };
            audit.ScrollTrigger.refresh();
            const reverse = [...progresses].reverse().map((progress) => {
                trigger.vars.onUpdate!({ progress, getVelocity: () => 0 });
                return { progress, styles: read() };
            });
            return { snapshots, reverse, counts };
        },
        expected.map((pose) => pose.progress)
    );
    for (const actual of [result.snapshots, [...result.reverse].reverse()]) {
        actual.forEach((pose, poseIndex) => {
            pose.styles.forEach((style, targetIndex) => {
                const original = expected[poseIndex].styles[targetIndex];
                expect(style.opacity).toBe(original.opacity);
                expect(style.visibility).toBe(original.visibility);
                // Invisible cards intentionally stop receiving transforms; their
                // last offscreen position depends on the direction of travel.
                if (Number(original.opacity) > 0) {
                    expect(style.transform).toBe(original.transform);
                    expect(style.zIndex).toBe(original.zIndex);
                }
            });
        });
    }
});

test("refresh, responsive changes and navigation keep one set of homepage triggers", async ({
    page,
    hasTouch,
}) => {
    test.setTimeout(60000);
    const inventory = () =>
        page.evaluate(() =>
            (window as AuditWindow).__animationAudit.ScrollTrigger.getAll().map((t) => ({
                section: t.trigger.closest("section,footer")?.id || "footer",
                pin: Boolean(t.pin),
                connected: t.trigger.isConnected,
                invalidate: Boolean(t.vars.invalidateOnRefresh),
            }))
        );
    const expectedCount = hasTouch ? 4 : 8;
    const original = await inventory();
    expect(original).toHaveLength(expectedCount);
    expect(original.filter((t) => t.pin)).toHaveLength(1);
    expect(original.every((t) => t.connected)).toBe(true);
    expect(original.filter((t) => t.invalidate).map((t) => t.section)).toEqual(["projects"]);
    const counts = await page.evaluate(() => {
        const audit = (window as AuditWindow).__animationAudit;
        for (const key in audit.counts) audit.counts[key] = 0;
        for (let i = 0; i < 3; i++) audit.ScrollTrigger.refresh();
        return { ...audit.counts };
    });
    // ScrollTrigger's own pin/snap setup may initialize a small internal tween.
    // Fixed section timelines must not be reparsed en masse (previously 139).
    expect(counts.cssInit).toBeLessThanOrEqual(5);
    expect(await inventory()).toEqual(original);
    await page.setViewportSize({ width: 844, height: 390 });
    await expect.poll(async () => (await inventory()).length).toBe(4);
    await page.setViewportSize(
        hasTouch ? { width: 390, height: 844 } : { width: 1920, height: 912 }
    );
    await expect.poll(inventory).toEqual(original);
    for (let cycle = 0; cycle < 2; cycle++) {
        await page
            .locator('header a[href="/en/works"]')
            .first()
            .evaluate((link: HTMLAnchorElement) => link.click());
        await page.waitForURL("**/en/works");
        await expect
            .poll(async () => (await inventory()).filter((t) => t.section !== "footer"))
            .toEqual([]);
        expect((await inventory()).every((t) => t.connected)).toBe(true);
        await page
            .locator('header a[href="/en"]')
            .first()
            .evaluate((link: HTMLAnchorElement) => link.click());
        await page.waitForURL("**/en");
        await expect.poll(inventory).toEqual(original);
        await expect(page.locator("#projects .pin-spacer")).toHaveCount(1);
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(inventory).toEqual([]);
    await expect(page.locator("#projects .pin-spacer")).toHaveCount(0);
    await expect(page.locator("[data-project-card]").first()).toHaveCSS("transform", "none");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect.poll(inventory).toEqual(original);
});

test("finished section reveals leave no 3D transform layers behind", async ({ page }) => {
    test.setTimeout(60000);
    for (const selector of ["#services", "#tools", "#reviews", "#cta", "footer"]) {
        const top = await page.evaluate(
            (selector) => document.querySelector(selector)!.getBoundingClientRect().top + scrollY,
            selector
        );
        for (let step = 0; step < 8; step++) {
            await page.evaluate((y) => scrollTo(0, y), Math.round(top - 400 + step * 60));
            await page.waitForTimeout(120);
        }
        await page.waitForTimeout(2500);
    }
    const leftovers = await page.evaluate(() =>
        Array.from(
            document.querySelectorAll<HTMLElement>(
                "#services h2, #tools h2, #tools p, #reviews h2, #reviews p, #reviews blockquote, #reviews button, #reviews [class*='decor'], #cta *, footer, footer *"
            )
        )
            .filter((element) => /translate3d|matrix3d/.test(element.style.transform))
            .map((element) => `${element.tagName}.${element.className}`)
    );
    expect(leftovers).toEqual([]);
});

test("section reveal timelines are initialized before the user scrolls to them", async ({
    page,
    hasTouch,
}) => {
    test.skip(hasTouch, "desktop runs every reveal through a ScrollTrigger timeline");
    test.setTimeout(60000);
    const inits = await page.evaluate(async () => {
        const audit = (window as AuditWindow).__animationAudit as unknown as {
            gsap: { plugins: { css: { prototype: { init: (...args: unknown[]) => unknown } } } };
        };
        const proto = audit.gsap.plugins.css.prototype;
        const init = proto.init;
        let count = 0;
        proto.init = function (target: unknown, ...rest: unknown[]) {
            if (!(target instanceof Element && target.closest("#projects"))) count++;
            return init.call(this, target, ...rest);
        };
        const end = document.documentElement.scrollHeight - innerHeight;
        for (let step = 0; step <= 300; step++) {
            scrollTo(0, Math.round((end * step) / 300));
            await new Promise(requestAnimationFrame);
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
        proto.init = init;
        return count;
    });
    expect(inits).toBeLessThanOrEqual(10);
});

test("Services cards change hit testing only after a crossing scroll settles", async ({ page }) => {
    test.setTimeout(60000);
    const result = await page.evaluate(async () => {
        const grid = document.querySelector<HTMLElement>("#services article")!.parentElement!;
        const cards = Array.from(grid.querySelectorAll<HTMLElement>(":scope > article"));
        const top = grid.getBoundingClientRect().top + scrollY - innerHeight;
        const end = top + grid.offsetHeight * 0.6;
        scrollTo(0, Math.round(top));
        await new Promise((resolve) => setTimeout(resolve, 400));
        let inertWrites = 0;
        const observer = new MutationObserver((entries) => {
            inertWrites += entries.length;
        });
        cards.forEach((card) =>
            observer.observe(card, { attributes: true, attributeFilter: ["inert"] })
        );
        const before = cards.map((card) => card.inert);
        for (let step = 1; step <= 60; step++) {
            scrollTo(0, Math.round(top + ((end - top) * step) / 60));
            await new Promise((resolve) => setTimeout(resolve, 40));
        }
        const duringScroll = inertWrites;
        const afterScroll = cards.map((card) => card.inert);
        observer.disconnect();
        return { before, duringScroll, afterScroll };
    });
    expect(result.duringScroll).toBe(0);
    expect(result.afterScroll).toEqual(result.before);
    await expect
        .poll(() =>
            page.evaluate(() =>
                Array.from(document.querySelectorAll<HTMLElement>("#services article")).some(
                    (card) => !card.inert && Number(card.style.opacity) > 0.5
                )
            )
        )
        .toBe(true);
    await expect
        .poll(() =>
            page.evaluate(() =>
                Array.from(document.querySelectorAll<HTMLElement>("#services article")).every(
                    (card) => card.inert === (card.style.pointerEvents === "none")
                )
            )
        )
        .toBe(true);
});

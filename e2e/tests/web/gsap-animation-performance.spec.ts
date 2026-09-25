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

test("Projects retains every pose and does not initialize CSSPlugin or measure DOM per frame", async ({
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
    expect(result.counts.cssInit).toBe(0);
    expect(result.counts.computedStyle).toBe(0);
    expect(result.counts.rect).toBe(0);
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
    expect(original.every((t) => t.connected && !t.invalidate)).toBe(true);
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

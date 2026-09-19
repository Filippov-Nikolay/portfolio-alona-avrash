import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildEventPayload, shouldDedupe, trackEvent } from "./analytics";

describe("shouldDedupe", () => {
    it("returns false when the entity was never tracked", () => {
        expect(shouldDedupe(Date.now(), undefined)).toBe(false);
    });

    it("returns true within the 30 minute window", () => {
        const now = Date.now();
        expect(shouldDedupe(now, now - 10 * 60 * 1000)).toBe(true);
    });

    it("returns false once the 30 minute window has passed", () => {
        const now = Date.now();
        expect(shouldDedupe(now, now - 31 * 60 * 1000)).toBe(false);
    });

    it("treats exactly 30 minutes as expired", () => {
        const now = Date.now();
        expect(shouldDedupe(now, now - 30 * 60 * 1000)).toBe(false);
    });
});

describe("buildEventPayload", () => {
    const context = {
        path: "/en/works",
        locale: "en",
        sessionId: "84f3c1a2-0000-0000-0000-000000000000",
        referrer: "https://google.com",
    };

    it("includes the entityId when given", () => {
        expect(buildEventPayload("project_open", { entityId: "crusty" }, context)).toEqual({
            eventName: "project_open",
            entityId: "crusty",
            path: "/en/works",
            locale: "en",
            sessionId: context.sessionId,
            referrer: "https://google.com",
        });
    });

    it("omits entityId when not given", () => {
        expect(buildEventPayload("cv_download", {}, context).entityId).toBeUndefined();
    });

    it("turns an empty referrer into undefined instead of an empty string", () => {
        const payload = buildEventPayload(
            "social_click",
            { entityId: "behance" },
            { ...context, referrer: "" }
        );
        expect(payload.referrer).toBeUndefined();
    });
});

function createFakeSessionStorage(): Storage {
    const store = new Map<string, string>();
    return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
        clear: () => store.clear(),
        key: () => null,
        get length() {
            return store.size;
        },
    } as Storage;
}

describe("trackEvent", () => {
    beforeEach(() => {
        vi.stubGlobal("window", { location: { pathname: "/en/works" } });
        vi.stubGlobal("document", { documentElement: { lang: "en" }, referrer: "" });
        vi.stubGlobal("sessionStorage", createFakeSessionStorage());
        vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENDPOINT", "https://analytics.example.com/event");
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
    });

    it("does not mark project_open as seen when sendBeacon fails to queue - it gets a real retry", () => {
        vi.stubGlobal("navigator", { sendBeacon: vi.fn().mockReturnValue(false) });

        trackEvent("project_open", { entityId: "17" });
        trackEvent("project_open", { entityId: "17" });

        expect(navigator.sendBeacon).toHaveBeenCalledTimes(2);
    });

    it("marks project_open as seen only once sendBeacon actually queues it", () => {
        vi.stubGlobal("navigator", { sendBeacon: vi.fn().mockReturnValue(true) });

        trackEvent("project_open", { entityId: "17" });
        trackEvent("project_open", { entityId: "17" });

        expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
    });

    it("does nothing when no analytics endpoint is configured", () => {
        vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENDPOINT", "");
        vi.stubGlobal("navigator", { sendBeacon: vi.fn() });

        trackEvent("project_open", { entityId: "17" });

        expect(navigator.sendBeacon).not.toHaveBeenCalled();
    });
});
